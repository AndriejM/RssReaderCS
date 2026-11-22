package pl.andriejsoft.rssreader.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.andriejsoft.rssreader.dto.RssItemDto;
import pl.andriejsoft.rssreader.dto.RssUnreadCountDto;
import pl.andriejsoft.rssreader.entity.RssItem;
import pl.andriejsoft.rssreader.entity.RssItemProjection;
import pl.andriejsoft.rssreader.enums.RssItemStatus;
import pl.andriejsoft.rssreader.repository.RssItemRepository;

@Service
@RequiredArgsConstructor
public class RssService {

  private final RssItemRepository rssItemRepository;
  private final ReadMarkerService readMarkerService;

  public RssItem save(RssItem rssItem) {
    return rssItemRepository.save(rssItem);
  }

  public RssItemDto getRssItemsById(Long id) {
    return rssItemRepository.findById(id).map(this::toDto).orElse(null);
  }

  @Transactional
  public RssItemDto setRssStatusToRead(Long id) {
    return rssItemRepository.findById(id)
        .map(rssItem -> rssItem.toBuilder().status(RssItemStatus.READ).build())
        .map(this::save)
        .map(item -> {
          readMarkerService.markRead(item);
          return toDto(item);
        })
        .orElse(null);
  }

  @Transactional
  public RssItemDto setRssStatusToUnread(Long id) {
    return rssItemRepository.findById(id)
        .map(rssItem -> rssItem.toBuilder().status(RssItemStatus.NEW).build())
        .map(this::save)
        .map(item -> {
          readMarkerService.remove(item.getUserId(), item.getSourceId(), item.getLink());
          return toDto(item);
        })
        .orElse(null);
  }

  @Transactional
  public RssItemDto deleteRssItem(Long id) {
    return rssItemRepository.findById(id)
        .map(rssItem -> rssItem.toBuilder().status(RssItemStatus.READ).build())
        .map(this::save)
        .map(item -> {
          readMarkerService.markRead(item);
          return toDto(item);
        })
        .orElse(null);
  }

  @Transactional
  public RssItemDto restoreRssItem(Long id) {
    return rssItemRepository.findById(id)
        .map(rssItem -> rssItem.toBuilder().status(RssItemStatus.NEW).build())
        .map(this::save)
        .map(item -> {
          readMarkerService.remove(item.getUserId(), item.getSourceId(), item.getLink());
          return toDto(item);
        })
        .orElse(null);
  }

  public List<RssItemDto> getRssItemsForUserAndGroup(Long userId, String groupUuid) {
    return rssItemRepository.getByUserIdAndGroupUuidAndStatus(userId, groupUuid, RssItemStatus.NEW)
        .stream()
        .map(this::toDto)
        .toList();
  }

  public List<RssItemDto> getAllRssByUser(Long userId) {
    return rssItemRepository.getByUserIdAndStatus(userId, RssItemStatus.NEW)
        .stream()
        .map(this::toDto)
        .toList();
  }

  public RssUnreadCountDto getUnreadCount(Long userId) {
    return RssUnreadCountDto.builder()
        .unread(rssItemRepository.countByUserIdAndStatus(userId, RssItemStatus.NEW))
        .build();
  }

  private RssItemDto toDto(RssItem item) {
    return RssItemDto.builder()
        .id(item.getId())
        .userId(item.getUserId())
        .groupUuid(item.getGroupUuid())
        .rssUuid(item.getRssUuid())
        .status(item.getStatus())
        .link(item.getLink())
        .title(item.getTitle())
        .pubDate(item.getPubDate())
        .sourceId(item.getSourceId())
        .sourceIdType(item.getSourceIdType())
        .feedName(item.getFeedName())
        .fetchedAt(item.getFetchedAt())
        .description(item.getItemPayload() == null ? null : item.getItemPayload().getDescription())
        .itemPayload(item.getItemPayload())
        .build();
  }

  private RssItemDto toDto(RssItemProjection item) {
    return RssItemDto.builder()
        .id(item.getId())
        .userId(item.getUserId())
        .groupUuid(item.getGroupUuid())
        .rssUuid(item.getRssUuid())
        .status(item.getStatus())
        .link(item.getLink())
        .title(item.getTitle())
        .pubDate(item.getPubDate())
        .sourceId(item.getSourceId())
        .sourceIdType(item.getSourceIdType())
        .feedName(item.getFeedName())
        .fetchedAt(item.getFetchedAt())
        .build();
  }
}
