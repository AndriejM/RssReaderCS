package pl.andriejsoft.rssreader.service;

import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import pl.andriejsoft.rssreader.entity.model.RssConfig;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeedHealthService {

  private static final int MAX_ERROR_MESSAGE = 300;
  private static final int MAX_BACKOFF_MINUTES = 1440;

  private final UserConfigService userConfigService;

  public boolean shouldWait(Long userId, String rssUuid) {
    return userConfigService.findRssConfig(userId, rssUuid)
        .map(RssConfig::getNextRetryAt)
        .filter(nextRetryAt -> nextRetryAt.isAfter(LocalDateTime.now()))
        .isPresent();
  }

  public void recordSuccess(Long userId, String rssUuid, String etag, String lastModified,
      LocalDateTime lastFetchedAt) {
    userConfigService.updateRssConfig(userId, rssUuid, rss -> {
      rss.setLastCheckedAt(LocalDateTime.now());
      rss.setLastOkAt(LocalDateTime.now());
      rss.setLastFetchedAt(lastFetchedAt);
      rss.setFetchFailureCount(0);
      rss.setNextRetryAt(null);
      rss.setLastErrorCode(null);
      rss.setLastErrorParams(null);
      rss.setLastErrorMessage(null);
      if (StringUtils.hasText(etag)) {
        rss.setEtag(etag);
      }
      if (StringUtils.hasText(lastModified)) {
        rss.setLastModified(lastModified);
      }
    });
  }

  public void recordFailure(Long userId, String rssUuid, String errorCode, String errorMessage) {
    userConfigService.updateRssConfig(userId, rssUuid, rss -> {
      int failures = Optional.ofNullable(rss.getFetchFailureCount()).orElse(0) + 1;
      rss.setFetchFailureCount(failures);
      rss.setLastCheckedAt(LocalDateTime.now());
      rss.setLastErrorAt(LocalDateTime.now());
      rss.setLastErrorCode(errorCode);
      rss.setLastErrorMessage(truncate(errorMessage));
      rss.setNextRetryAt(LocalDateTime.now().plusMinutes(backoffMinutes(failures)));
    });
  }

  public void updateIcon(Long userId, String rssUuid, String icon) {
    if (!StringUtils.hasText(icon)) {
      return;
    }
    userConfigService.updateRssConfig(userId, rssUuid, rss -> rss.setIcon(icon));
  }

  private int backoffMinutes(int failures) {
    if (failures <= 1) {
      return 1;
    }
    int exponent = Math.min(failures - 1, 10);
    return Math.min(MAX_BACKOFF_MINUTES, 1 << exponent);
  }

  private String truncate(String value) {
    if (value == null) {
      return null;
    }
    return value.length() <= MAX_ERROR_MESSAGE ? value : value.substring(0, MAX_ERROR_MESSAGE);
  }
}
