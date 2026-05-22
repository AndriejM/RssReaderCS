package pl.andriejsoft.rssreader.controller;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.andriejsoft.rssreader.dto.RssItemDto;
import pl.andriejsoft.rssreader.service.RssService;

@RequestMapping("/rss")
@RestController
@RequiredArgsConstructor
public class RssController {

  private final RssService rssService;

  @GetMapping("/list/{userId}")
  public List<RssItemDto> getAllRssByUser(@PathVariable Long userId) {
    return rssService.getAllRssByUser(userId);
  }

  @GetMapping("/list/{userId}/{groupUuid}")
  public List<RssItemDto> getRss(@PathVariable Long userId, @PathVariable String groupUuid) {
    return rssService.getRssItemsForUserAndGroup(userId, groupUuid);
  }

  @GetMapping("/rss/{id}")
  public RssItemDto getRssById(@PathVariable Long id) {
    return rssService.getRssItemsById(id);
  }

  @PutMapping("/rss/{id}/set-status-read")
  public RssItemDto setRssStatusToRead(@PathVariable Long id) {
    return rssService.getRssItemsById(id);
  }
}
