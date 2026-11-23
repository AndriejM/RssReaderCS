package pl.andriejsoft.rssreader.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.andriejsoft.rssreader.entity.model.RssConfig;

@ExtendWith(MockitoExtension.class)
class FeedHealthServiceTest {

  private static final Long USER_ID = 1L;
  private static final String UUID = "rss-uuid";

  @Mock
  private UserConfigService userConfigService;

  private FeedHealthService service;

  @BeforeEach
  void setUp() {
    service = new FeedHealthService(userConfigService);
  }

  @Test
  void shouldWaitIsTrueWhenNextRetryIsInTheFuture() {
    when(userConfigService.findRssConfig(USER_ID, UUID))
        .thenReturn(Optional.of(RssConfig.builder().nextRetryAt(LocalDateTime.now().plusMinutes(5)).build()));

    assertThat(service.shouldWait(USER_ID, UUID)).isTrue();
  }

  @Test
  void shouldWaitIsFalseWhenNextRetryHasPassed() {
    when(userConfigService.findRssConfig(USER_ID, UUID))
        .thenReturn(Optional.of(RssConfig.builder().nextRetryAt(LocalDateTime.now().minusMinutes(1)).build()));

    assertThat(service.shouldWait(USER_ID, UUID)).isFalse();
  }

  @Test
  void shouldWaitIsFalseWhenFeedIsUnknown() {
    when(userConfigService.findRssConfig(USER_ID, UUID)).thenReturn(Optional.empty());

    assertThat(service.shouldWait(USER_ID, UUID)).isFalse();
  }

  @Test
  void recordSuccessClearsErrorStateAndStoresValidators() {
    LocalDateTime fetchedAt = LocalDateTime.now().minusSeconds(5);

    service.recordSuccess(USER_ID, UUID, "\"etag-1\"", "Mon, 02 Jan 2006 15:04:05 GMT", fetchedAt);

    RssConfig rss = RssConfig.builder()
        .fetchFailureCount(4)
        .lastErrorCode("HTTP_ERROR")
        .lastErrorMessage("boom")
        .nextRetryAt(LocalDateTime.now().plusMinutes(10))
        .build();
    applyUpdate(rss);

    assertThat(rss.getFetchFailureCount()).isZero();
    assertThat(rss.getLastErrorCode()).isNull();
    assertThat(rss.getLastErrorMessage()).isNull();
    assertThat(rss.getNextRetryAt()).isNull();
    assertThat(rss.getLastOkAt()).isNotNull();
    assertThat(rss.getLastFetchedAt()).isEqualTo(fetchedAt);
    assertThat(rss.getEtag()).isEqualTo("\"etag-1\"");
    assertThat(rss.getLastModified()).isEqualTo("Mon, 02 Jan 2006 15:04:05 GMT");
  }

  @Test
  void recordSuccessKeepsExistingValidatorsWhenResponseHasNone() {
    service.recordSuccess(USER_ID, UUID, null, null, LocalDateTime.now());

    RssConfig rss = RssConfig.builder().etag("\"old\"").lastModified("old-date").build();
    applyUpdate(rss);

    assertThat(rss.getEtag()).isEqualTo("\"old\"");
    assertThat(rss.getLastModified()).isEqualTo("old-date");
  }

  @Test
  void recordFailureIncrementsCounterAndSetsBackoff() {
    service.recordFailure(USER_ID, UUID, "HTTP_ERROR", "HTTP 500");

    RssConfig rss = RssConfig.builder().fetchFailureCount(2).build();
    applyUpdate(rss);

    assertThat(rss.getFetchFailureCount()).isEqualTo(3);
    assertThat(rss.getLastErrorCode()).isEqualTo("HTTP_ERROR");
    assertThat(rss.getLastErrorMessage()).isEqualTo("HTTP 500");
    assertThat(rss.getLastCheckedAt()).isNotNull();
    assertThat(rss.getLastErrorAt()).isNotNull();
    assertThat(rss.getNextRetryAt()).isAfter(LocalDateTime.now());
  }

  @Test
  void recordFailureTreatsMissingCounterAsZero() {
    service.recordFailure(USER_ID, UUID, "FETCH_ERROR", "timeout");

    RssConfig rss = RssConfig.builder().fetchFailureCount(null).build();
    applyUpdate(rss);

    assertThat(rss.getFetchFailureCount()).isEqualTo(1);
  }

  @Test
  void recordFailureTruncatesLongMessages() {
    service.recordFailure(USER_ID, UUID, "FETCH_ERROR", "x".repeat(500));

    RssConfig rss = RssConfig.builder().build();
    applyUpdate(rss);

    assertThat(rss.getLastErrorMessage()).hasSize(300);
  }

  @Test
  void backoffGrowsExponentiallyAndPlateaus() {
    assertBackoff(1, 1);
    assertBackoff(2, 2);
    assertBackoff(3, 4);
    assertBackoff(5, 16);
    assertBackoff(11, 1024);
    assertBackoff(50, 1024);
  }

  @Test
  void updateIconIgnoresBlankValues() {
    service.updateIcon(USER_ID, UUID, "  ");

    verify(userConfigService, never()).updateRssConfig(eq(USER_ID), eq(UUID), any());
  }

  @Test
  void updateIconStoresValue() {
    service.updateIcon(USER_ID, UUID, "/favicon.ico");

    RssConfig rss = RssConfig.builder().build();
    applyUpdate(rss);

    assertThat(rss.getIcon()).isEqualTo("/favicon.ico");
  }

  private void assertBackoff(int failures, int expectedMinutes) {
    LocalDateTime before = LocalDateTime.now();
    service.recordFailure(USER_ID, UUID, "CODE", "message");

    RssConfig rss = RssConfig.builder().fetchFailureCount(failures - 1).build();
    applyUpdate(rss);
    LocalDateTime after = LocalDateTime.now();

    assertThat(rss.getNextRetryAt())
        .isBetween(before.minusSeconds(1).plusMinutes(expectedMinutes),
            after.plusSeconds(2).plusMinutes(expectedMinutes));
  }

  @SuppressWarnings("unchecked")
  private void applyUpdate(RssConfig rss) {
    ArgumentCaptor<Consumer<RssConfig>> captor = ArgumentCaptor.forClass(Consumer.class);
    verify(userConfigService, atLeastOnce()).updateRssConfig(eq(USER_ID), eq(UUID), captor.capture());
    captor.getAllValues().getLast().accept(rss);
  }
}
