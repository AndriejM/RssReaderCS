package pl.andriejsoft.rssreader.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class FeedLockService {

  private static final long LOCK_TTL_MS = 45_000L;

  private final Map<String, Long> locks = new ConcurrentHashMap<>();

  public boolean tryLock(String feedId) {
    if (feedId == null) {
      return true;
    }
    long now = System.currentTimeMillis();
    Long current = locks.get(feedId);
    if (current != null && current > now) {
      return false;
    }
    locks.put(feedId, now + LOCK_TTL_MS);
    return true;
  }

  public void unlock(String feedId) {
    if (feedId != null) {
      locks.remove(feedId);
    }
  }

  public boolean isBusy(String feedId) {
    if (feedId == null) {
      return false;
    }
    Long until = locks.get(feedId);
    return until != null && until > System.currentTimeMillis();
  }

  public void cleanup() {
    long now = System.currentTimeMillis();
    locks.values().removeIf(until -> until <= now);
  }
}
