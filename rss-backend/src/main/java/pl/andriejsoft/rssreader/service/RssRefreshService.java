package pl.andriejsoft.rssreader.service;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.andriejsoft.rssreader.dto.RssRefreshAllResultDto;
import pl.andriejsoft.rssreader.dto.RssRefreshResultDto;
import pl.andriejsoft.rssreader.entity.model.Group;
import pl.andriejsoft.rssreader.entity.model.RssConfig;
import pl.andriejsoft.rssreader.entity.model.UserConfigPayload;

@Service
@RequiredArgsConstructor
@Slf4j
public class RssRefreshService {

  private final UserConfigService userConfigService;
  private final RssLoaderService rssLoaderService;
  private final FeedLockService feedLockService;

  public RssRefreshResultDto refreshOne(Long userId, String rssUuid) {
    Optional<FeedTarget> target = findTarget(userId, rssUuid);
    if (target.isEmpty()) {
      return RssRefreshResultDto.builder()
          .ok(false)
          .rssUuid(rssUuid)
          .error("Feed not found")
          .build();
    }
    return refreshTarget(target.get());
  }

  public RssRefreshAllResultDto refreshAll(Long userId) {
    List<FeedTarget> targets = findTargets(userId);
    List<RssRefreshResultDto> results = targets.stream().map(this::refreshTarget).toList();
    int failed = (int) results.stream().filter(result -> !result.isOk() && !result.isBusy()).count();
    return RssRefreshAllResultDto.builder()
        .ok(failed == 0)
        .failed(failed)
        .results(results)
        .build();
  }

  private RssRefreshResultDto refreshTarget(FeedTarget target) {
    RssConfig rss = target.rss();
    if (feedLockService.isBusy(rss.getUuid())) {
      return toResult(rss, RssLoadResult.builder().ok(false).busy(true).error("Feed is busy").build());
    }
    if (!feedLockService.tryLock(rss.getUuid())) {
      return toResult(rss, RssLoadResult.builder().ok(false).busy(true).error("Feed is busy").build());
    }
    try {
      RssLoadResult result = rssLoaderService.loadRss(target.userId(), target.groupUuid(), rss);
      return toResult(rss, result);
    } finally {
      feedLockService.unlock(rss.getUuid());
    }
  }

  private RssRefreshResultDto toResult(RssConfig rss, RssLoadResult result) {
    return RssRefreshResultDto.builder()
        .ok(result.isOk())
        .rssUuid(rss.getUuid())
        .name(rss.getName())
        .added(result.getAdded())
        .skipped(result.getSkipped())
        .seen(result.getSeen())
        .notModified(result.isNotModified())
        .busy(result.isBusy())
        .error(result.getError())
        .build();
  }

  private Optional<FeedTarget> findTarget(Long userId, String rssUuid) {
    return findTargets(userId).stream()
        .filter(target -> target.rss().getUuid().equals(rssUuid))
        .findFirst();
  }

  private List<FeedTarget> findTargets(Long userId) {
    return Optional.ofNullable(userConfigService.findConfigById(userId))
        .map(config -> config.getUserConfigPayload())
        .map(UserConfigPayload::getGroups)
        .stream()
        .flatMap(List::stream)
        .filter(group -> group.getRssConfigs() != null)
        .flatMap(group -> group.getRssConfigs().stream()
            .map(rss -> new FeedTarget(userId, group.getUuid(), rss)))
        .toList();
  }

  private record FeedTarget(Long userId, String groupUuid, RssConfig rss) {

  }
}
