package pl.andriejsoft.rssreader.service;

import com.apptasticsoftware.rssreader.Item;
import com.apptasticsoftware.rssreader.RssReader;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import pl.andriejsoft.rssreader.entity.RssItem;
import pl.andriejsoft.rssreader.entity.model.JobParams;
import pl.andriejsoft.rssreader.entity.model.RssConfig;
import pl.andriejsoft.rssreader.entity.model.RssItemPayload;
import pl.andriejsoft.rssreader.enums.SourceIdType;
import pl.andriejsoft.rssreader.repository.RssItemRepository;
import pl.andriejsoft.rssreader.utils.InvalidXmlCharacterFilter;

@Service
@RequiredArgsConstructor
@Slf4j
public class RssLoaderService {

  private static final int MAX_ITEMS_PER_FEED = 250;
  private static final int MAX_ITEMS_TOTAL = 2000;
  private static final int MAX_PREVIEW_CHARS = 8000;

  private final RssItemRepository rssItemRepository;
  private final ReadMarkerService readMarkerService;

  public void loadRss(JobParams jobParams) {
    loadRss(jobParams.getUserId(), jobParams.getGroupUuid(), jobParams.getRss());
  }

  public void loadRss(Long userId, String groupUuid, RssConfig rss) {
    RssReader rssReader = new RssReader();
    rssReader.addFeedFilter(new InvalidXmlCharacterFilter());
    try {
      List<Item> items = rssReader.read(rss.getUrl()).toList();
      items.sort(Comparator.comparing((Item item) -> getPubDate(item),
          Comparator.nullsFirst(Comparator.naturalOrder())).reversed());

      for (Item item : items) {
        saveIfNew(userId, groupUuid, rss, item);
      }
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public void setReadStatusForExpiredItems(Long userId, LocalDateTime expiredDate) {
    rssItemRepository.setStatusByUserIdAndStatusAndPubDate(userId, expiredDate);
  }

  public void deleteForExpiredItems(Long userId, LocalDateTime expiredDate) {
    rssItemRepository.deleteByUserIdAndStatusAndPubDate(userId, expiredDate);
  }

  private void saveIfNew(Long userId, String groupUuid, RssConfig rss, Item item) {
    String link = item.getLink().filter(StringUtils::hasText).orElse(null);
    String guid = item.getGuid().filter(StringUtils::hasText).orElse(null);
    String sourceId = StringUtils.hasText(guid) ? guid : link;
    SourceIdType sourceIdType = StringUtils.hasText(guid) ? SourceIdType.GUID : SourceIdType.LINK;
    if (!StringUtils.hasText(sourceId)) {
      return;
    }

    if (readMarkerService.isRead(userId, sourceId, link)) {
      log.trace("Item {} is already read, skipped.", sourceId);
      return;
    }

    if (exists(userId, rss.getUuid(), sourceId, link)) {
      log.trace("Item {} is exists, skipped.", sourceId);
      return;
    }

    if (rssItemRepository.countByUserIdAndRssUuid(userId, rss.getUuid()) >= MAX_ITEMS_PER_FEED
        || rssItemRepository.countByUserId(userId) >= MAX_ITEMS_TOTAL) {
      log.trace("Item cap reached for user {} feed {}", userId, rss.getUuid());
      return;
    }

    String title = item.getTitle().orElse(null);
    LocalDateTime pubDate = getPubDate(item);
    RssItemPayload rssItemPayload = RssItemPayload.builder()
        .title(title)
        .link(link)
        .description(cleanDescription(item.getDescription().orElse(item.getContent().orElse(null))))
        .pubDate(pubDate)
        .build();

    RssItem rssItem = RssItem.builder()
        .userId(userId)
        .groupUuid(groupUuid)
        .rssUuid(rss.getUuid())
        .itemUuid(sourceId)
        .sourceId(sourceId)
        .sourceIdType(sourceIdType)
        .feedName(rss.getName())
        .link(link)
        .title(title)
        .pubDate(pubDate)
        .fetchedAt(LocalDateTime.now())
        .itemPayload(rssItemPayload)
        .build();

    rssItemRepository.save(rssItem);
    log.info("Rss item loaded successfully for {}", sourceId);
  }

  private boolean exists(Long userId, String rssUuid, String sourceId, String link) {
    if (StringUtils.hasText(sourceId)
        && rssItemRepository.findByUserIdAndRssUuidAndSourceId(userId, rssUuid, sourceId).isPresent()) {
      return true;
    }
    return StringUtils.hasText(link)
        && rssItemRepository.findByUserIdAndRssUuidAndLink(userId, rssUuid, link).isPresent();
  }

  private LocalDateTime getPubDate(Item item) {
    return item.getPubDateZonedDateTime()
        .map(ZonedDateTime::toLocalDateTime)
        .orElseGet(() -> item.getUpdatedZonedDateTime().map(ZonedDateTime::toLocalDateTime).orElse(null));
  }

  private String cleanDescription(String description) {
    if (description == null) {
      return null;
    }
    String cleaned = description.trim().replaceAll("\\{", "[").replaceAll("}", "]");
    if (cleaned.length() > MAX_PREVIEW_CHARS) {
      return cleaned.substring(0, MAX_PREVIEW_CHARS);
    }
    return cleaned;
  }
}
