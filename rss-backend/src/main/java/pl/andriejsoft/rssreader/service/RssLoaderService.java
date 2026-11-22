package pl.andriejsoft.rssreader.service;

import com.apptasticsoftware.rssreader.Item;
import com.apptasticsoftware.rssreader.RssReader;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
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
  private static final int MAX_FEED_BYTES = 5_000_000;
  private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(20);
  private static final String USER_AGENT = "RssReader/2.0";

  private final RssItemRepository rssItemRepository;
  private final ReadMarkerService readMarkerService;
  private final FeedHealthService feedHealthService;
  private final EncodingService encodingService;
  private final FaviconService faviconService;
  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;

  public RssLoadResult loadRss(JobParams jobParams) {
    return loadRss(jobParams.getUserId(), jobParams.getGroupUuid(), jobParams.getRss());
  }

  public RssLoadResult loadRss(Long userId, String groupUuid, RssConfig rss) {
    if (rss == null || !StringUtils.hasText(rss.getUrl())) {
      return RssLoadResult.builder().ok(false).error("Feed URL is empty").build();
    }
    try {
      FetchResponse response = fetch(rss);
      if (response.notModified()) {
        feedHealthService.recordSuccess(userId, rss.getUuid(), rss.getEtag(), rss.getLastModified(),
            rss.getLastFetchedAt());
        return RssLoadResult.builder().ok(true).notModified(true).build();
      }
      if (response.status() >= 400) {
        String error = "HTTP " + response.status();
        feedHealthService.recordFailure(userId, rss.getUuid(), "HTTP_ERROR", error);
        return RssLoadResult.builder().ok(false).error(error).build();
      }

      String decoded = encodingService.decode(response.body(), response.contentType());
      List<FeedEntry> entries = parse(decoded, response.contentType());
      entries.sort(Comparator.comparing(FeedEntry::pubDate,
          Comparator.nullsFirst(Comparator.naturalOrder())).reversed());

      int added = 0;
      int skipped = 0;
      for (FeedEntry entry : entries) {
        if (saveIfNew(userId, groupUuid, rss, entry)) {
          added++;
        } else {
          skipped++;
        }
      }

      if (!StringUtils.hasText(rss.getIcon())) {
        String icon = faviconService.fetchIcon(rss.getUrl());
        if (StringUtils.hasText(icon)) {
          rss.setIcon(icon);
          feedHealthService.updateIcon(userId, rss.getUuid(), icon);
        }
      }

      LocalDateTime fetchedAt = LocalDateTime.now();
      rss.setLastFetchedAt(fetchedAt);
      feedHealthService.recordSuccess(userId, rss.getUuid(), response.etag(), response.lastModified(),
          fetchedAt);
      return RssLoadResult.builder()
          .ok(true)
          .added(added)
          .skipped(skipped)
          .seen(entries.size())
          .build();
    } catch (Exception e) {
      log.warn("Failed to load feed {}", rss.getUrl(), e);
      feedHealthService.recordFailure(userId, rss.getUuid(), "FETCH_ERROR", e.getMessage());
      return RssLoadResult.builder().ok(false).error(e.getMessage()).build();
    }
  }

  public void setReadStatusForExpiredItems(Long userId, LocalDateTime expiredDate) {
    rssItemRepository.setStatusByUserIdAndStatusAndPubDate(userId, expiredDate);
  }

  public void deleteForExpiredItems(Long userId, LocalDateTime expiredDate) {
    rssItemRepository.deleteByUserIdAndStatusAndPubDate(userId, expiredDate);
  }

  private FetchResponse fetch(RssConfig rss) throws Exception {
    HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(rss.getUrl()))
        .timeout(REQUEST_TIMEOUT)
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json;q=0.9, */*;q=0.8")
        .header("Accept-Encoding", "identity")
        .GET();
    if (StringUtils.hasText(rss.getEtag())) {
      builder.header("If-None-Match", rss.getEtag());
    }
    if (StringUtils.hasText(rss.getLastModified())) {
      builder.header("If-Modified-Since", rss.getLastModified());
    }

    HttpResponse<byte[]> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
    String etag = response.headers().firstValue("ETag").orElse(null);
    String lastModified = response.headers().firstValue("Last-Modified").orElse(null);
    String contentType = response.headers().firstValue("Content-Type").orElse(null);
    byte[] body = response.body() == null ? new byte[0] : response.body();
    if (body.length > MAX_FEED_BYTES) {
      throw new IllegalStateException("Feed is too large");
    }
    return new FetchResponse(response.statusCode(), contentType, etag, lastModified, body,
        response.statusCode() == 304);
  }

  private List<FeedEntry> parse(String decoded, String contentType) throws Exception {
    if (!StringUtils.hasText(decoded)) {
      return List.of();
    }
    String trimmed = decoded.trim();
    if (isJson(contentType, trimmed)) {
      return parseJsonFeed(trimmed);
    }
    return parseXmlFeed(decoded);
  }

  private boolean isJson(String contentType, String trimmed) {
    if (StringUtils.hasText(contentType) && contentType.toLowerCase().contains("json")) {
      return true;
    }
    return trimmed.startsWith("{");
  }

  private List<FeedEntry> parseXmlFeed(String decoded) throws Exception {
    RssReader rssReader = new RssReader();
    byte[] bytes = decoded.getBytes(StandardCharsets.UTF_8);
    InputStream stream = new InvalidXmlCharacterFilter().filter(new ByteArrayInputStream(bytes));
    List<Item> items = rssReader.read(stream).toList();
    List<FeedEntry> entries = new ArrayList<>(items.size());
    for (Item item : items) {
      String link = item.getLink().filter(StringUtils::hasText).orElse(null);
      String guid = item.getGuid().filter(StringUtils::hasText).orElse(null);
      String sourceId = StringUtils.hasText(guid) ? guid : link;
      if (!StringUtils.hasText(sourceId)) {
        continue;
      }
      entries.add(new FeedEntry(
          sourceId,
          StringUtils.hasText(guid) ? SourceIdType.GUID : SourceIdType.LINK,
          link,
          item.getTitle().orElse(null),
          getPubDate(item),
          cleanDescription(item.getDescription().orElse(item.getContent().orElse(null)))
      ));
    }
    return entries;
  }

  private List<FeedEntry> parseJsonFeed(String decoded) throws Exception {
    JsonNode root = objectMapper.readTree(decoded);
    JsonNode items = root.path("items");
    if (!items.isArray()) {
      return List.of();
    }
    List<FeedEntry> entries = new ArrayList<>();
    for (JsonNode item : items) {
      String id = text(item, "id");
      String url = text(item, "url");
      String externalUrl = text(item, "external_url");
      String sourceId = StringUtils.hasText(id) ? id : url;
      if (!StringUtils.hasText(sourceId)) {
        continue;
      }
      String link = StringUtils.hasText(url) ? url : externalUrl;
      String description = cleanDescription(firstText(item, "content_text", "content_html"));
      entries.add(new FeedEntry(
          sourceId,
          SourceIdType.JSON_ID,
          link,
          text(item, "title"),
          parseDate(firstText(item, "date_published", "date_modified")),
          description
      ));
    }
    return entries;
  }

  private boolean saveIfNew(Long userId, String groupUuid, RssConfig rss, FeedEntry entry) {
    String sourceId = entry.sourceId();
    String link = entry.link();
    if (!StringUtils.hasText(sourceId)) {
      return false;
    }

    if (readMarkerService.isRead(userId, sourceId, link)) {
      log.trace("Item {} is already read, skipped.", sourceId);
      return false;
    }

    if (exists(userId, rss.getUuid(), sourceId, link)) {
      log.trace("Item {} is exists, skipped.", sourceId);
      return false;
    }

    if (rssItemRepository.countByUserIdAndRssUuid(userId, rss.getUuid()) >= MAX_ITEMS_PER_FEED
        || rssItemRepository.countByUserId(userId) >= MAX_ITEMS_TOTAL) {
      log.trace("Item cap reached for user {} feed {}", userId, rss.getUuid());
      return false;
    }

    RssItemPayload rssItemPayload = RssItemPayload.builder()
        .title(entry.title())
        .link(link)
        .description(entry.description())
        .pubDate(entry.pubDate())
        .build();

    RssItem rssItem = RssItem.builder()
        .userId(userId)
        .groupUuid(groupUuid)
        .rssUuid(rss.getUuid())
        .itemUuid(sourceId)
        .sourceId(sourceId)
        .sourceIdType(entry.sourceIdType())
        .feedName(rss.getName())
        .link(link)
        .title(entry.title())
        .pubDate(entry.pubDate())
        .fetchedAt(LocalDateTime.now())
        .itemPayload(rssItemPayload)
        .build();

    rssItemRepository.save(rssItem);
    log.info("Rss item loaded successfully for {}", sourceId);
    return true;
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

  private LocalDateTime parseDate(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    try {
      return OffsetDateTime.parse(value).toLocalDateTime();
    } catch (DateTimeParseException e) {
      return null;
    }
  }

  private String firstText(JsonNode node, String... fields) {
    for (String field : fields) {
      String value = text(node, field);
      if (StringUtils.hasText(value)) {
        return value;
      }
    }
    return null;
  }

  private String text(JsonNode node, String field) {
    return Optional.ofNullable(node.get(field))
        .filter(JsonNode::isTextual)
        .map(JsonNode::asText)
        .orElse(null);
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

  private record FetchResponse(
      int status,
      String contentType,
      String etag,
      String lastModified,
      byte[] body,
      boolean notModified) {

  }
}
