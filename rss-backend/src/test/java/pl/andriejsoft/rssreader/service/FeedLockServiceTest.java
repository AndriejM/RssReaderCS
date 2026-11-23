package pl.andriejsoft.rssreader.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Field;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FeedLockServiceTest {

  private FeedLockService service;

  @BeforeEach
  void setUp() {
    service = new FeedLockService();
  }

  @Test
  void tryLockSucceedsForUnknownFeed() {
    assertThat(service.tryLock("feed-1")).isTrue();
    assertThat(service.isBusy("feed-1")).isTrue();
  }

  @Test
  void tryLockFailsWhileFeedIsHeld() {
    service.tryLock("feed-1");

    assertThat(service.tryLock("feed-1")).isFalse();
  }

  @Test
  void unlockFreesTheFeed() {
    service.tryLock("feed-1");
    service.unlock("feed-1");

    assertThat(service.isBusy("feed-1")).isFalse();
    assertThat(service.tryLock("feed-1")).isTrue();
  }

  @Test
  void expiredLockIsReacquirable() throws Exception {
    putLock("feed-1", System.currentTimeMillis() - 1);

    assertThat(service.isBusy("feed-1")).isFalse();
    assertThat(service.tryLock("feed-1")).isTrue();
  }

  @Test
  void cleanupRemovesOnlyExpiredLocks() throws Exception {
    service.tryLock("fresh");
    putLock("stale", System.currentTimeMillis() - 1);

    service.cleanup();

    assertThat(service.isBusy("fresh")).isTrue();
    assertThat(locks().containsKey("stale")).isFalse();
  }

  @Test
  void nullFeedIdIsNeverBusy() throws Exception {
    assertThat(service.tryLock(null)).isTrue();
    assertThat(service.isBusy(null)).isFalse();
    service.unlock(null);
    assertThat(locks()).isEmpty();
  }

  @SuppressWarnings("unchecked")
  private Map<String, Long> locks() throws Exception {
    Field field = FeedLockService.class.getDeclaredField("locks");
    field.setAccessible(true);
    return (Map<String, Long>) field.get(service);
  }

  private void putLock(String feedId, long expiresAt) throws Exception {
    locks().put(feedId, expiresAt);
  }
}
