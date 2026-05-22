package pl.andriejsoft.rssreader.service;

import com.apptasticsoftware.rssreader.Item;
import com.apptasticsoftware.rssreader.RssReader;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pl.andriejsoft.rssreader.entity.RssItem;
import pl.andriejsoft.rssreader.entity.model.JobParams;
import pl.andriejsoft.rssreader.entity.model.RssConfig;
import pl.andriejsoft.rssreader.entity.model.RssItemPayload;
import pl.andriejsoft.rssreader.enums.RssItemStatus;
import pl.andriejsoft.rssreader.repository.RssItemRepository;
import pl.andriejsoft.rssreader.utils.InvalidXmlCharacterFilter;

@Service
@Slf4j
public class RssLoaderService {

  @Autowired
  private RssItemRepository rssItemRepository;

  public void loadRss(JobParams jobParams) {
    loadRss(jobParams.getUserId(), jobParams.getGroupUuid(), jobParams.getRss());
  }

  public void loadRss(Long useId, String groupUuid, RssConfig rss) {
    RssReader rssReader = new RssReader();
    rssReader.addFeedFilter(new InvalidXmlCharacterFilter());
    try {
      List<Item> items = rssReader.read(rss.getUrl()).toList();
      items.forEach(item -> {
        String link = item.getLink().orElse(null);
        String title = item.getTitle().orElse(null);
        if (rssItemRepository.findByLink(link).isEmpty()) {
          LocalDateTime pubDate = item.getPubDateZonedDateTime()
              .map(ZonedDateTime::toLocalDateTime).orElse(null);
          RssItemPayload rssItemPayload = RssItemPayload.builder()
              .title(title)
              .link(link)
              .description(cleanDescription(item.getDescription().orElse(null)))
              .pubDate(pubDate)
              .build();
          RssItem rssItem = RssItem.builder()
              .userId(useId)
              .groupUuid(groupUuid)
              .itemUuid(rss.getUuid())
              .link(link)
              .title(title)
              .pubDate(pubDate)
              .itemPayload(rssItemPayload)
              .build();
          rssItemRepository.save(rssItem);
          log.info("Rss item loaded successfully for {}", link);
        } else {
          log.trace("Link {} is exists, skipped.", link);
        }
      });
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public void setReadStatusForExpiredItems(Long userId, LocalDateTime expiredDate) {
    rssItemRepository.setStatusByUserIdAndStatusAndPubDate(userId, RssItemStatus.READ, expiredDate);
  }

  public void deleteForExpiredItems(Long userId, LocalDateTime expiredDate) {
    rssItemRepository.deleteByUserIdAndStatusAndPubDate(userId, RssItemStatus.READ, expiredDate);
  }

  private String cleanDescription(String description) {
    if (description == null) {
      return null;
    }
    return description.trim().replaceAll("\\{", "[").replaceAll("}", "]");
  }
}
