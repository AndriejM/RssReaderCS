package pl.andriejsoft.rssreader.service;

import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import pl.andriejsoft.rssreader.entity.ReadMarker;
import pl.andriejsoft.rssreader.entity.RssItem;
import pl.andriejsoft.rssreader.repository.ReadMarkerRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReadMarkerService {

  private static final int MAX_MARKERS_PER_USER = 1000;

  private final ReadMarkerRepository readMarkerRepository;

  public boolean isRead(Long userId, String sourceId, String link) {
    if (userId == null) {
      return false;
    }
    if (StringUtils.hasText(sourceId) && readMarkerRepository.existsByUserIdAndSourceId(userId, sourceId)) {
      return true;
    }
    return StringUtils.hasText(link) && readMarkerRepository.existsByUserIdAndLink(userId, link);
  }

  @Transactional
  public ReadMarker markRead(RssItem item) {
    if (item == null || item.getUserId() == null) {
      return null;
    }
    String sourceId = StringUtils.hasText(item.getSourceId()) ? item.getSourceId() : item.getLink();
    if (!StringUtils.hasText(sourceId) && !StringUtils.hasText(item.getLink())) {
      return null;
    }
    if (isRead(item.getUserId(), sourceId, item.getLink())) {
      return null;
    }
    ReadMarker marker = ReadMarker.builder()
        .userId(item.getUserId())
        .rssUuid(item.getRssUuid())
        .link(item.getLink())
        .sourceId(sourceId)
        .sourceIdType(item.getSourceIdType())
        .pubDate(item.getPubDate())
        .markedAt(LocalDateTime.now())
        .build();
    return readMarkerRepository.save(marker);
  }

  @Transactional
  public void remove(Long userId, String sourceId, String link) {
    if (userId == null) {
      return;
    }
    if (StringUtils.hasText(sourceId)) {
      readMarkerRepository.deleteByUserIdAndSourceId(userId, sourceId);
    }
    if (StringUtils.hasText(link)) {
      readMarkerRepository.deleteByUserIdAndLink(userId, link);
    }
  }

  @Transactional
  public void forget(Long userId) {
    if (userId == null) {
      return;
    }
    readMarkerRepository.deleteByUserId(userId);
  }

  @Transactional
  public void purgeExpired(Long userId, int ttlDays) {
    if (userId == null || ttlDays <= 0) {
      return;
    }
    readMarkerRepository.deleteByUserIdAndMarkedAtBefore(userId, LocalDateTime.now().minusDays(ttlDays));
  }

  @Transactional
  public void trim(Long userId) {
    if (userId == null) {
      return;
    }
    List<ReadMarker> markers = readMarkerRepository.findByUserIdOrderByMarkedAtDesc(userId);
    if (markers.size() <= MAX_MARKERS_PER_USER) {
      return;
    }
    readMarkerRepository.deleteAll(markers.subList(MAX_MARKERS_PER_USER, markers.size()));
  }
}
