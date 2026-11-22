package pl.andriejsoft.rssreader.controller;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.andriejsoft.rssreader.dto.RssFullTextDto;
import pl.andriejsoft.rssreader.dto.RssItemDto;
import pl.andriejsoft.rssreader.dto.RssRefreshAllResultDto;
import pl.andriejsoft.rssreader.dto.RssRefreshResultDto;
import pl.andriejsoft.rssreader.dto.RssUnreadCountDto;
import pl.andriejsoft.rssreader.service.ArticleExtractor;
import pl.andriejsoft.rssreader.service.RssRefreshService;
import pl.andriejsoft.rssreader.service.RssService;

@RequestMapping("/rss")
@RestController
@RequiredArgsConstructor
public class RssController {

  private final RssService rssService;
  private final RssRefreshService rssRefreshService;
  private final ArticleExtractor articleExtractor;

  @GetMapping("/list/{userId}")
  public List<RssItemDto> getAllRssByUser(@PathVariable Long userId) {
    return rssService.getAllRssByUser(userId);
  }

  @GetMapping("/list/{userId}/{groupUuid}")
  public List<RssItemDto> getRss(@PathVariable Long userId, @PathVariable String groupUuid) {
    return rssService.getRssItemsForUserAndGroup(userId, groupUuid);
  }

  @GetMapping("/unread-count/{userId}")
  public RssUnreadCountDto getUnreadCount(@PathVariable Long userId) {
    return rssService.getUnreadCount(userId);
  }

  @GetMapping("/rss/{id}")
  public RssItemDto getRssById(@PathVariable Long id) {
    return rssService.getRssItemsById(id);
  }

  @PutMapping("/rss/{id}/set-status-read")
  public RssItemDto setRssStatusToRead(@PathVariable Long id) {
    return rssService.setRssStatusToRead(id);
  }

  @PostMapping("/rss/{id}/mark-read")
  public RssItemDto markRead(@PathVariable Long id) {
    return rssService.setRssStatusToRead(id);
  }

  @PostMapping("/rss/{id}/mark-unread")
  public RssItemDto markUnread(@PathVariable Long id) {
    return rssService.setRssStatusToUnread(id);
  }

  @DeleteMapping("/rss/{id}")
  public RssItemDto deleteRssItem(@PathVariable Long id) {
    return rssService.deleteRssItem(id);
  }

  @PostMapping("/rss/{id}/restore")
  public RssItemDto restoreRssItem(@PathVariable Long id) {
    return rssService.restoreRssItem(id);
  }

  @PostMapping("/rss/{id}/full-text")
  public RssFullTextDto fullText(@PathVariable Long id) {
    RssItemDto item = rssService.getRssItemsById(id);
    if (item == null) {
      return RssFullTextDto.builder().id(id).error("Item not found").build();
    }
    ArticleExtractor.ExtractionResult result = articleExtractor.extract(item.getLink());
    return RssFullTextDto.builder()
        .id(id)
        .link(item.getLink())
        .title(item.getTitle())
        .text(result.getText())
        .paragraphs(result.getParagraphs())
        .truncated(result.isTruncated())
        .error(result.getError())
        .build();
  }

  @PostMapping("/refresh/{userId}/{rssUuid}")
  public RssRefreshResultDto refresh(@PathVariable Long userId, @PathVariable String rssUuid) {
    return rssRefreshService.refreshOne(userId, rssUuid);
  }

  @PostMapping("/refresh-all/{userId}")
  public RssRefreshAllResultDto refreshAll(@PathVariable Long userId) {
    return rssRefreshService.refreshAll(userId);
  }
}
