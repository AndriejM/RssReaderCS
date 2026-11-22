package pl.andriejsoft.rssreader.controller;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.andriejsoft.rssreader.dto.FeedExportDto;
import pl.andriejsoft.rssreader.dto.FeedImportResultDto;
import pl.andriejsoft.rssreader.dto.RssConfigDto;
import pl.andriejsoft.rssreader.service.FeedService;

@RequestMapping("/feeds")
@RestController
@RequiredArgsConstructor
public class FeedController {

  private final FeedService feedService;

  @GetMapping("/{userId}")
  public List<RssConfigDto> list(@PathVariable Long userId) {
    return feedService.listFeeds(userId);
  }

  @GetMapping("/export/{userId}")
  public FeedExportDto export(@PathVariable Long userId) {
    return feedService.export(userId);
  }

  @PostMapping("/import/{userId}")
  public FeedImportResultDto importFeeds(@PathVariable Long userId, @RequestBody FeedExportDto feedExport) {
    return feedService.importFeeds(userId, feedExport);
  }
}
