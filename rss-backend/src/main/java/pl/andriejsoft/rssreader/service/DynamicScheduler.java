package pl.andriejsoft.rssreader.service;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.View;
import pl.andriejsoft.rssreader.dto.UserConfigDto;
import pl.andriejsoft.rssreader.entity.AppConfigEntity;
import pl.andriejsoft.rssreader.entity.model.JobParams;
import pl.andriejsoft.rssreader.entity.model.UserSettingsPayload;
import pl.andriejsoft.rssreader.utils.LogHelper;

@Service
@Slf4j
public class DynamicScheduler {

  @Autowired
  private ThreadPoolTaskScheduler scheduler;

  @Autowired
  private UserConfigService userConfigService;

  @Autowired
  private AppConfigService appConfigService;

  @Autowired
  private RssLoaderService rssLoaderService;

  @Autowired
  private ReadMarkerService readMarkerService;

  @Autowired
  private FeedLockService feedLockService;

  @Autowired
  private FeedHealthService feedHealthService;

  private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();
  @Autowired
  private View error;

  @PostConstruct
  public void init() {
    startSchedulersForCurrentUser();
  }

  @Scheduled(fixedDelay = 15 * 60 * 1000, initialDelay = 5 * 60 * 1000)
  public void startCleaning() {
    log.info("Starting cleaning ...");
    feedLockService.cleanup();
    AppConfigEntity appConfig = appConfigService.getAppConfig();
    UserConfigDto currentUserConfig = userConfigService.getCurrentUserConfig();

    cleanOldRssRecords(currentUserConfig.getId(),
        appConfig.getAppConfigPayload().getDaysForSetRead(),
        appConfig.getAppConfigPayload().getDaysForCleanRssItems());

    int readTtlDays = Optional.ofNullable(currentUserConfig.getUserConfigPayload())
        .map(payload -> payload.getSettings())
        .map(UserSettingsPayload::getReadTtlDays)
        .orElse(appConfig.getAppConfigPayload().getDaysForSetRead());
    readMarkerService.purgeExpired(currentUserConfig.getId(), readTtlDays);
    readMarkerService.trim(currentUserConfig.getId());
  }

  public void cleanOldRssRecords(Long currentUserId, Integer daysForSetRead, Integer daysForClean) {
    try {
      rssLoaderService.setReadStatusForExpiredItems(currentUserId,
          LocalDateTime.now().minusDays(daysForSetRead));
      rssLoaderService.deleteForExpiredItems(currentUserId,
          LocalDateTime.now().minusDays(daysForClean));
    } catch (Exception e) {
      log.error("Error of cleaning data.", e);
      throw new RuntimeException(e);
    }
  }

  public void startSchedulersForCurrentUser() {
    log.info("Starting scheduler for current user ...");
    UserConfigDto userConfig = userConfigService.getCurrentUserConfig();

    List<JobParams> jobParams = userConfig.getUserConfigPayload().getGroups().stream()
        .flatMap(group -> {
              return group.getRssConfigs().stream().map(rss ->
                  JobParams.builder()
                      .userId(userConfig.getId())
                      .groupUuid(group.getUuid())
                      .rss(rss)
                      .build()
              );
            }
        ).toList();

    if (!jobParams.isEmpty()) {
      update(jobParams);
    }
  }

  private void update(List<JobParams> taskList) {
    for (JobParams task : taskList) {
      LogHelper.info("Start scheduling rss:{}", task);
      String id = task.getRss().getUuid();
      String cron = task.getRss().getRefreshCronExpression();

      cancelIfExists(id);

      Runnable job = () -> runJob(task);
      if (isValid(cron)) {
        CronTrigger trigger = new CronTrigger(cron);
        ScheduledFuture<?> future = scheduler.schedule(job, trigger);
        scheduledTasks.put(id, future);
        updateNextRunAt(task, nextCronRun(cron));
      } else if (task.getRss().getRefreshMinutes() != null && task.getRss().getRefreshMinutes() > 0) {
        Duration interval = Duration.ofMinutes(task.getRss().getRefreshMinutes());
        ScheduledFuture<?> future = scheduler.scheduleWithFixedDelay(job, interval);
        scheduledTasks.put(id, future);
        updateNextRunAt(task, LocalDateTime.now().plus(interval));
      }
    }

    // cancel jobs that no longer exist in the database
    scheduledTasks.keySet().removeIf(id -> {
      boolean noLongerInDb = taskList.stream()
          .noneMatch(t -> t.getRss().getUuid().equals(id));
      if (noLongerInDb) {
        cancelIfExists(id);
      }
      return noLongerInDb;
    });
  }

  private ScheduledFuture<?> cancelIfExists(String id) {
    ScheduledFuture<?> existing = scheduledTasks.get(id);
    if (existing != null) {
      existing.cancel(false);
    }
    return existing;
  }

  private void runJob(JobParams task) {
    String id = task.getRss().getUuid();
    if (feedHealthService.shouldWait(task.getUserId(), id)) {
      log.debug("Skipping feed {} until next retry", id);
      return;
    }
    if (!feedLockService.tryLock(id)) {
      log.debug("Skipping busy feed {}", id);
      return;
    }
    try {
      LogHelper.info("Loading RSS Items for {}", task);
      rssLoaderService.loadRss(task);
    } finally {
      feedLockService.unlock(id);
    }
  }

  private void updateNextRunAt(JobParams task, LocalDateTime nextRunAt) {
    userConfigService.updateRssConfig(task.getUserId(), task.getRss().getUuid(),
        rss -> rss.setNextRunAt(nextRunAt));
  }

  private LocalDateTime nextCronRun(String cron) {
    try {
      return CronExpression.parse(cron).next(LocalDateTime.now());
    } catch (Exception e) {
      return null;
    }
  }

  private boolean isValid(String expression) {
    return CronExpression.isValidExpression(expression);
  }
}
