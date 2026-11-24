package pl.andriejsoft.rssreader.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import pl.andriejsoft.rssreader.dto.UserConfigDto;
import pl.andriejsoft.rssreader.entity.AppConfigEntity;
import pl.andriejsoft.rssreader.entity.model.AppConfigPayload;
import pl.andriejsoft.rssreader.entity.model.Group;
import pl.andriejsoft.rssreader.entity.model.JobParams;
import pl.andriejsoft.rssreader.entity.model.RssConfig;
import pl.andriejsoft.rssreader.entity.model.UserConfigPayload;
import pl.andriejsoft.rssreader.entity.model.UserSettingsPayload;

@ExtendWith(MockitoExtension.class)
class DynamicSchedulerTest {

  private static final Long USER_ID = 1L;

  @Mock
  private ThreadPoolTaskScheduler scheduler;
  @Mock
  private UserConfigService userConfigService;
  @Mock
  private AppConfigService appConfigService;
  @Mock
  private RssLoaderService rssLoaderService;
  @Mock
  private ReadMarkerService readMarkerService;
  @Mock
  private FeedLockService feedLockService;
  @Mock
  private FeedHealthService feedHealthService;

  @InjectMocks
  private DynamicScheduler service;

  @Test
  void startCleaningPurgesAndTrimsMarkers() {
    when(appConfigService.getAppConfig()).thenReturn(appConfig(3, 4));
    when(userConfigService.findConfigAll()).thenReturn(List.of(userConfig(settings(10))));

    service.startCleaning();

    verify(feedLockService).cleanup();
    verify(rssLoaderService).setReadStatusForExpiredItems(eq(USER_ID), any(LocalDateTime.class));
    verify(rssLoaderService).deleteForExpiredItems(eq(USER_ID), any(LocalDateTime.class));
    verify(readMarkerService).purgeExpired(USER_ID, 10);
    verify(readMarkerService).trim(USER_ID);
  }

  @Test
  void startCleaningCleansEveryUser() {
    when(appConfigService.getAppConfig()).thenReturn(appConfig(3, 4));
    when(userConfigService.findConfigAll()).thenReturn(List.of(userConfig(settings(10)), userConfig(2L, null)));

    service.startCleaning();

    verify(rssLoaderService).setReadStatusForExpiredItems(eq(USER_ID), any(LocalDateTime.class));
    verify(rssLoaderService).setReadStatusForExpiredItems(eq(2L), any(LocalDateTime.class));
    verify(readMarkerService).purgeExpired(USER_ID, 10);
    verify(readMarkerService).purgeExpired(2L, 3);
    verify(readMarkerService).trim(2L);
  }

  @Test
  void startCleaningAppliesPerFeedCleanMinutes() {
    RssConfig feed = rss("rss-1", null, null);
    feed.setCleanMinutes(120);
    when(appConfigService.getAppConfig()).thenReturn(appConfig(3, 4));
    when(userConfigService.findConfigAll()).thenReturn(List.of(userConfigWithFeeds(settings(10), feed)));

    LocalDateTime before = LocalDateTime.now().minusMinutes(1);
    service.startCleaning();

    ArgumentCaptor<LocalDateTime> cutoff = ArgumentCaptor.forClass(LocalDateTime.class);
    verify(rssLoaderService).deleteFeedItemsBefore(eq(USER_ID), eq("rss-1"), cutoff.capture());
    assertThat(cutoff.getValue()).isBetween(before.minusMinutes(120), LocalDateTime.now().minusMinutes(120).plusMinutes(2));
  }

  @Test
  void startCleaningSkipsPerFeedCleanupWithoutCleanMinutes() {
    when(appConfigService.getAppConfig()).thenReturn(appConfig(3, 4));
    when(userConfigService.findConfigAll()).thenReturn(List.of(userConfigWithFeeds(settings(10), rss("rss-1", null, null))));

    service.startCleaning();

    verify(rssLoaderService, never()).deleteFeedItemsBefore(any(), any(), any());
  }

  @Test
  void startCleaningFallsBackToAppConfigTtlWhenSettingsAreMissing() {
    when(appConfigService.getAppConfig()).thenReturn(appConfig(3, 4));
    when(userConfigService.findConfigAll()).thenReturn(List.of(userConfig(null)));

    service.startCleaning();

    verify(readMarkerService).purgeExpired(USER_ID, 3);
  }

  @Test
  void startCleaningWrapsLoaderFailure() {
    when(appConfigService.getAppConfig()).thenReturn(appConfig(3, 4));
    when(userConfigService.findConfigAll()).thenReturn(List.of(userConfig(settings(10))));
    doThrow(new IllegalStateException("db down")).when(rssLoaderService)
        .setReadStatusForExpiredItems(any(), any());

    assertThatThrownBy(() -> service.startCleaning())
        .isInstanceOf(RuntimeException.class)
        .hasCauseInstanceOf(IllegalStateException.class);

    verify(readMarkerService, never()).trim(any());
  }

  @Test
  void cleanOldRssRecordsUsesGivenDayOffsets() {
    LocalDateTime before = LocalDateTime.now().minusMinutes(1);

    service.cleanOldRssRecords(USER_ID, 3, 4);

    ArgumentCaptor<LocalDateTime> readCutoff = ArgumentCaptor.forClass(LocalDateTime.class);
    ArgumentCaptor<LocalDateTime> deleteCutoff = ArgumentCaptor.forClass(LocalDateTime.class);
    verify(rssLoaderService).setReadStatusForExpiredItems(eq(USER_ID), readCutoff.capture());
    verify(rssLoaderService).deleteForExpiredItems(eq(USER_ID), deleteCutoff.capture());
    assertThat(readCutoff.getValue()).isBetween(before.minusDays(3), LocalDateTime.now().minusDays(3).plusMinutes(2));
    assertThat(deleteCutoff.getValue()).isBetween(before.minusDays(4), LocalDateTime.now().minusDays(4).plusMinutes(2));
  }

  @Test
  void schedulesCronJobAndRecordsNextRunAt() throws Exception {
    stubCurrentUser(rss("rss-1", "0 0 * * * ?", null));
    doReturn(future()).when(scheduler).schedule(any(Runnable.class), any(CronTrigger.class));

    service.startSchedulersForCurrentUser();

    assertThat(tasks()).containsKey("rss-1");
    @SuppressWarnings("unchecked")
    ArgumentCaptor<Consumer<RssConfig>> mutator = ArgumentCaptor.forClass(Consumer.class);
    verify(userConfigService).updateRssConfig(eq(USER_ID), eq("rss-1"), mutator.capture());
    RssConfig stored = rss("rss-1", null, null);
    mutator.getValue().accept(stored);
    assertThat(stored.getNextRunAt()).isNotNull();
  }

  @Test
  void schedulesIntervalJobWhenCronIsMissing() throws Exception {
    stubCurrentUser(rss("rss-1", null, 15));
    doReturn(future()).when(scheduler).scheduleWithFixedDelay(any(Runnable.class), any(Duration.class));

    service.startSchedulersForCurrentUser();

    verify(scheduler).scheduleWithFixedDelay(any(Runnable.class), eq(Duration.ofMinutes(15)));
    assertThat(tasks()).containsKey("rss-1");
  }

  @Test
  void invalidCronFallsBackToInterval() throws Exception {
    stubCurrentUser(rss("rss-1", "not a cron", 30));
    doReturn(future()).when(scheduler).scheduleWithFixedDelay(any(Runnable.class), any(Duration.class));

    service.startSchedulersForCurrentUser();

    verify(scheduler, never()).schedule(any(Runnable.class), any(CronTrigger.class));
    verify(scheduler).scheduleWithFixedDelay(any(Runnable.class), eq(Duration.ofMinutes(30)));
  }

  @Test
  void doesNotScheduleWithoutCronOrInterval() throws Exception {
    stubCurrentUser(rss("rss-1", null, null));

    service.startSchedulersForCurrentUser();

    verifyNoInteractions(scheduler);
    assertThat(tasks()).isEmpty();
  }

  @Test
  void cancelsJobsThatNoLongerExist() throws Exception {
    stubCurrentUser(rss("live", "0 0 * * * ?", null));
    doReturn(future()).when(scheduler).schedule(any(Runnable.class), any(CronTrigger.class));
    ScheduledFuture<?> stale = future();
    tasks().put("gone", stale);

    service.startSchedulersForCurrentUser();

    verify(stale).cancel(false);
    assertThat(tasks()).containsOnlyKeys("live");
  }

  @Test
  void reschedulingCancelsThePreviousFuture() throws Exception {
    stubCurrentUser(rss("rss-1", "0 0 * * * ?", null));
    ScheduledFuture<?> previous = future();
    tasks().put("rss-1", previous);
    doReturn(future()).when(scheduler).schedule(any(Runnable.class), any(CronTrigger.class));

    service.startSchedulersForCurrentUser();

    verify(previous).cancel(false);
    assertThat(tasks()).containsKey("rss-1");
  }

  @Test
  void scheduledJobSkipsWhenHealthSaysWait() throws Exception {
    Runnable job = scheduledJob(rss("rss-1", "0 0 * * * ?", null));
    when(feedHealthService.shouldWait(USER_ID, "rss-1")).thenReturn(true);

    job.run();

    verifyNoInteractions(feedLockService);
    verify(rssLoaderService, never()).loadRss(any(JobParams.class));
  }

  @Test
  void scheduledJobSkipsBusyFeed() throws Exception {
    Runnable job = scheduledJob(rss("rss-1", "0 0 * * * ?", null));
    when(feedLockService.tryLock("rss-1")).thenReturn(false);

    job.run();

    verify(rssLoaderService, never()).loadRss(any(JobParams.class));
    verify(feedLockService, never()).unlock(anyString());
  }

  @Test
  void scheduledJobUnlocksAfterLoading() throws Exception {
    Runnable job = scheduledJob(rss("rss-1", "0 0 * * * ?", null));
    when(feedLockService.tryLock("rss-1")).thenReturn(true);

    job.run();

    verify(rssLoaderService).loadRss(any(JobParams.class));
    verify(feedLockService).unlock("rss-1");
  }

  @Test
  void scheduledJobUnlocksWhenLoaderThrows() throws Exception {
    Runnable job = scheduledJob(rss("rss-1", "0 0 * * * ?", null));
    when(feedLockService.tryLock("rss-1")).thenReturn(true);
    doThrow(new IllegalStateException("boom")).when(rssLoaderService).loadRss(any(JobParams.class));

    assertThatThrownBy(job::run).isInstanceOf(IllegalStateException.class).hasMessage("boom");

    verify(feedLockService).unlock("rss-1");
  }

  private Runnable scheduledJob(RssConfig rss) throws Exception {
    stubCurrentUser(rss);
    doReturn(future()).when(scheduler).schedule(any(Runnable.class), any(CronTrigger.class));

    service.startSchedulersForCurrentUser();

    ArgumentCaptor<Runnable> job = ArgumentCaptor.forClass(Runnable.class);
    verify(scheduler).schedule(job.capture(), any(CronTrigger.class));
    return job.getValue();
  }

  private void stubCurrentUser(RssConfig... feeds) {
    Group group = Group.builder()
        .uuid("group-1")
        .name("DEFAULT")
        .rssConfigs(new ArrayList<>(List.of(feeds)))
        .build();
    when(userConfigService.getCurrentUserConfig()).thenReturn(UserConfigDto.builder()
        .id(USER_ID)
        .userConfigPayload(UserConfigPayload.builder()
            .groups(new ArrayList<>(List.of(group)))
            .build())
        .build());
  }

  private AppConfigEntity appConfig(int daysForSetRead, int daysForClean) {
    return AppConfigEntity.builder()
        .appConfigPayload(AppConfigPayload.builder()
            .defaultUserId(USER_ID)
            .daysForSetRead(daysForSetRead)
            .daysForCleanRssItems(daysForClean)
            .build())
        .build();
  }

  private UserConfigDto userConfig(UserSettingsPayload settings) {
    return userConfig(USER_ID, settings);
  }

  private UserConfigDto userConfig(Long id, UserSettingsPayload settings) {
    return UserConfigDto.builder()
        .id(id)
        .userConfigPayload(UserConfigPayload.builder().settings(settings).build())
        .build();
  }

  private UserConfigDto userConfigWithFeeds(UserSettingsPayload settings, RssConfig... feeds) {
    Group group = Group.builder()
        .uuid("group-1")
        .name("DEFAULT")
        .rssConfigs(new ArrayList<>(List.of(feeds)))
        .build();
    return UserConfigDto.builder()
        .id(USER_ID)
        .userConfigPayload(UserConfigPayload.builder()
            .settings(settings)
            .groups(new ArrayList<>(List.of(group)))
            .build())
        .build();
  }

  private UserSettingsPayload settings(Integer readTtlDays) {
    return UserSettingsPayload.builder().readTtlDays(readTtlDays).build();
  }

  private RssConfig rss(String uuid, String cron, Integer refreshMinutes) {
    return RssConfig.builder()
        .uuid(uuid)
        .name("Feed " + uuid)
        .url("https://example.com/" + uuid)
        .refreshCronExpression(cron)
        .refreshMinutes(refreshMinutes)
        .build();
  }

  @SuppressWarnings("unchecked")
  private ScheduledFuture<?> future() {
    return mock(ScheduledFuture.class);
  }

  @SuppressWarnings("unchecked")
  private Map<String, ScheduledFuture<?>> tasks() throws Exception {
    Field field = DynamicScheduler.class.getDeclaredField("scheduledTasks");
    field.setAccessible(true);
    return (Map<String, ScheduledFuture<?>>) field.get(service);
  }
}
