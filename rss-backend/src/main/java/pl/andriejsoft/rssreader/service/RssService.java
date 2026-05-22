package pl.andriejsoft.rssreader.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pl.andriejsoft.rssreader.dto.RssItemDto;
import pl.andriejsoft.rssreader.entity.RssItem;
import pl.andriejsoft.rssreader.enums.RssItemStatus;
import pl.andriejsoft.rssreader.repository.RssItemRepository;

@Service
public class RssService {

  @Autowired
  private RssItemRepository rssItemRepository;

  public RssItem save(RssItem rssItem) {
    return rssItemRepository.save(rssItem);
  }

  public RssItemDto getRssItemsById(Long id) {
    return rssItemRepository.findById(id).map(item -> RssItemDto.builder()
            .id(item.getId())
            .userId(item.getUserId())
            .groupUuid(item.getGroupUuid())
            .rssUuid(item.getRssUuid())
            .status(item.getStatus())
            .link(item.getLink())
            .pubDate(item.getPubDate())
            .itemPayload(item.getItemPayload())
            .build())
        .orElse(null);
  }

  public RssItemDto setRssStatusToRead(Long id) {
    return rssItemRepository.findById(id)
        .map(rssItem -> rssItem.toBuilder().status(RssItemStatus.READ).build())
        .map(this::save)
        .map(item -> RssItemDto.builder()
            .id(item.getId())
            .userId(item.getUserId())
            .groupUuid(item.getGroupUuid())
            .rssUuid(item.getRssUuid())
            .status(item.getStatus())
            .link(item.getLink())
            .pubDate(item.getPubDate())
            .itemPayload(item.getItemPayload())
            .build())
        .orElse(null);
  }


  public List<RssItemDto> getRssItemsForUserAndGroup(Long userId, String groupUuid) {
    return rssItemRepository.getByUserIdAndGroupUuidAndStatus(userId, groupUuid, RssItemStatus.NEW)
        .stream()
        .map(item -> RssItemDto.builder()
            .id(item.getId())
            .rssUuid(item.getRssUuid())
            .userId(item.getUserId())
            .groupUuid(item.getGroupUuid())
            .status(item.getStatus())
            .link(item.getLink())
            .title(item.getTitle())
            .pubDate(item.getPubDate())
            .build()).toList();
  }

  public List<RssItemDto> getAllRssByUser(Long userId) {
    return rssItemRepository.getByUserIdAndStatus(userId, RssItemStatus.NEW)
        .stream()
        .map(item -> RssItemDto.builder()
            .id(item.getId())
            .rssUuid(item.getRssUuid())
            .userId(item.getUserId())
            .groupUuid(item.getGroupUuid())
            .status(item.getStatus())
            .link(item.getLink())
            .title(item.getTitle())
            .pubDate(item.getPubDate())
            .build()).toList();
  }
}
