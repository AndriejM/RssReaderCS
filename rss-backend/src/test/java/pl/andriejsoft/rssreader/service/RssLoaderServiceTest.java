package pl.andriejsoft.rssreader.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.andriejsoft.rssreader.entity.RssItem;
import pl.andriejsoft.rssreader.entity.model.RssConfig;
import pl.andriejsoft.rssreader.enums.SourceIdType;
import pl.andriejsoft.rssreader.repository.RssItemRepository;

@ExtendWith(MockitoExtension.class)
class RssLoaderServiceTest {

  private static final Long USER_ID = 1L;
  private static final String GROUP_UUID = "group-1";
  private static final String FEED_URL = "https://example.com/feed.xml";
  private static final int MAX_FEED_BYTES = 5_000_000;

  @Mock
  private RssItemRepository rssItemRepository;
  @Mock
  private ReadMarkerService readMarkerService;
  @Mock
  private FeedHealthService feedHealthService;
  @Mock
  private FaviconService faviconService;
  @Mock
  private HttpClient httpClient;

  private RssLoaderService service;
  private RssConfig rss;

  @BeforeEach
  void setUp() {
    service = new RssLoaderService(rssItemRepository, readMarkerService, feedHealthService,
        new EncodingService(), faviconService, httpClient, new ObjectMapper());
    rss = RssConfig.builder()
        .uuid("rss-1")
        .name("Example")
        .url(FEED_URL)
        .icon("https://example.com/favicon.ico")
        .build();
  }

  @Test
  void loadRssRejectsMissingFeedConfig() {
    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, null);

    assertThat(result.isOk()).isFalse();
    assertThat(result.getError()).isEqualTo("Feed URL is empty");
    verifyNoInteractions(httpClient);
  }

  @Test
  void loadRssRejectsBlankUrl() {
    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID,
        RssConfig.builder().uuid("rss-1").url("   ").build());

    assertThat(result.isOk()).isFalse();
    verifyNoInteractions(httpClient);
  }

  @Test
  void conditionalGetSendsValidators() throws Exception {
    rss.setEtag("\"etag-1\"");
    rss.setLastModified("Mon, 02 Jan 2006 15:04:05 GMT");
    stubResponse(304, new byte[0], null, null, null);

    service.loadRss(USER_ID, GROUP_UUID, rss);

    ArgumentCaptor<HttpRequest> captor = ArgumentCaptor.forClass(HttpRequest.class);
    verify(httpClient).send(captor.capture(), any(HttpResponse.BodyHandler.class));
    HttpRequest request = captor.getValue();
    assertThat(request.headers().firstValue("If-None-Match")).contains("\"etag-1\"");
    assertThat(request.headers().firstValue("If-Modified-Since")).contains("Mon, 02 Jan 2006 15:04:05 GMT");
  }

  @Test
  void conditionalGetReturnsNotModifiedWithoutTouchingRepository() throws Exception {
    rss.setEtag("\"etag-1\"");
    rss.setLastModified("old-date");
    LocalDateTime previousFetch = LocalDateTime.now().minusDays(1);
    rss.setLastFetchedAt(previousFetch);
    stubResponse(304, new byte[0], null, null, null);

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.isOk()).isTrue();
    assertThat(result.isNotModified()).isTrue();
    assertThat(result.getSeen()).isZero();
    verifyNoInteractions(rssItemRepository);
    verify(feedHealthService).recordSuccess(USER_ID, "rss-1", "\"etag-1\"", "old-date", previousFetch);
  }

  @Test
  void httpErrorIsRecordedAsFailure() throws Exception {
    stubResponse(503, "<html/>".getBytes(StandardCharsets.UTF_8), "text/html", null, null);

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.isOk()).isFalse();
    assertThat(result.getError()).isEqualTo("HTTP 503");
    verify(feedHealthService).recordFailure(USER_ID, "rss-1", "HTTP_ERROR", "HTTP 503");
    verifyNoInteractions(rssItemRepository);
  }

  @Test
  void savesNewItemsFromRssFeed() throws Exception {
    stubXml(200, rssXml(
        itemXml("First", "https://example.com/1", "guid-1", "Mon, 02 Jan 2006 15:04:05 GMT", "desc 1"),
        itemXml("Second", "https://example.com/2", "guid-2", "Tue, 03 Jan 2006 15:04:05 GMT", "desc 2")));

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.isOk()).isTrue();
    assertThat(result.getAdded()).isEqualTo(2);
    assertThat(result.getSeen()).isEqualTo(2);
    assertThat(result.getSkipped()).isZero();
    verify(rssItemRepository, times(2)).save(any(RssItem.class));
  }

  @Test
  void mapsGuidAndLinkToSourceIdType() throws Exception {
    stubXml(200, rssXml(
        itemXml("With guid", "https://example.com/1", "guid-1", "Mon, 02 Jan 2006 15:04:05 GMT", "d1"),
        itemXmlWithoutGuid("Without guid", "https://example.com/2", "Tue, 03 Jan 2006 15:04:05 GMT", "d2")));

    service.loadRss(USER_ID, GROUP_UUID, rss);

    List<RssItem> saved = captureSaved();
    RssItem guidItem = saved.stream()
        .filter(i -> "guid-1".equals(i.getSourceId())).findFirst().orElseThrow();
    RssItem linkItem = saved.stream()
        .filter(i -> "https://example.com/2".equals(i.getSourceId())).findFirst().orElseThrow();

    assertThat(guidItem.getSourceIdType()).isEqualTo(SourceIdType.GUID);
    assertThat(linkItem.getSourceIdType()).isEqualTo(SourceIdType.LINK);
    assertThat(linkItem.getItemUuid()).isEqualTo("https://example.com/2");
    assertThat(guidItem.getGroupUuid()).isEqualTo(GROUP_UUID);
    assertThat(guidItem.getUserId()).isEqualTo(USER_ID);
    assertThat(guidItem.getFeedName()).isEqualTo("Example");
    assertThat(guidItem.getFetchedAt()).isNotNull();
  }

  @Test
  void skipsItemsWithoutAnyIdentifier() throws Exception {
    stubXml(200, rssXml(itemXml("Orphan", "", "", "Mon, 02 Jan 2006 15:04:05 GMT", "no ids")));

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.getSeen()).isZero();
    assertThat(result.getAdded()).isZero();
    verifyNoInteractions(rssItemRepository);
  }

  @Test
  void skipsAlreadyStoredItemBySourceId() throws Exception {
    when(rssItemRepository.findByUserIdAndRssUuidAndSourceId(USER_ID, "rss-1", "guid-1"))
        .thenReturn(Optional.of(RssItem.builder().id(7L).build()));
    stubXml(200, rssXml(itemXml("First", "https://example.com/1", "guid-1", "Mon, 02 Jan 2006 15:04:05 GMT", "d")));

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.getSkipped()).isEqualTo(1);
    assertThat(result.getAdded()).isZero();
    verify(rssItemRepository, never()).save(any());
  }

  @Test
  void skipsAlreadyStoredItemByLink() throws Exception {
    when(rssItemRepository.findByUserIdAndRssUuidAndLink(USER_ID, "rss-1", "https://example.com/1"))
        .thenReturn(Optional.of(RssItem.builder().id(7L).build()));
    stubXml(200, rssXml(itemXmlWithoutGuid("First", "https://example.com/1", "Mon, 02 Jan 2006 15:04:05 GMT", "d")));

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.getSkipped()).isEqualTo(1);
    verify(rssItemRepository, never()).save(any());
  }

  @Test
  void skipsItemsTheUserAlreadyRead() throws Exception {
    when(readMarkerService.isRead(USER_ID, "guid-1", "https://example.com/1")).thenReturn(true);
    stubXml(200, rssXml(itemXml("First", "https://example.com/1", "guid-1", "Mon, 02 Jan 2006 15:04:05 GMT", "d")));

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.getSkipped()).isEqualTo(1);
    verify(rssItemRepository, never()).save(any());
    verify(rssItemRepository, never()).findByUserIdAndRssUuidAndSourceId(any(), anyString(), anyString());
  }

  @Test
  void respectsPerFeedItemCap() throws Exception {
    when(rssItemRepository.countByUserIdAndRssUuid(USER_ID, "rss-1")).thenReturn(250L);
    stubXml(200, rssXml(itemXml("First", "https://example.com/1", "guid-1", "Mon, 02 Jan 2006 15:04:05 GMT", "d")));

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.getSkipped()).isEqualTo(1);
    verify(rssItemRepository, never()).save(any());
  }

  @Test
  void respectsTotalItemCap() throws Exception {
    when(rssItemRepository.countByUserId(USER_ID)).thenReturn(2000L);
    stubXml(200, rssXml(itemXml("First", "https://example.com/1", "guid-1", "Mon, 02 Jan 2006 15:04:05 GMT", "d")));

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.getSkipped()).isEqualTo(1);
    verify(rssItemRepository, never()).save(any());
  }

  @Test
  void truncatesOverlongDescriptions() throws Exception {
    stubXml(200, rssXml(itemXml("Long", "https://example.com/1", "guid-1",
        "Mon, 02 Jan 2006 15:04:05 GMT", "x".repeat(9000))));

    service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(captureSaved().getFirst().getItemPayload().getDescription()).hasSize(8000);
  }

  @Test
  void replacesBracesInDescriptions() throws Exception {
    stubXml(200, rssXml(itemXml("Braces", "https://example.com/1", "guid-1",
        "Mon, 02 Jan 2006 15:04:05 GMT", "a{b}c")));

    service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(captureSaved().getFirst().getItemPayload().getDescription()).isEqualTo("a[b]c");
  }

  @Test
  void parsesJsonFeed() throws Exception {
    String json = """
        {"version":"https://jsonfeed.org/version/1","title":"JSON feed","items":[
          {"id":"json-1","url":"https://example.com/j1","title":"J1",
           "content_text":"hello","date_published":"2024-01-02T15:04:05Z"}
        ]}""";
    stubResponse(200, json.getBytes(StandardCharsets.UTF_8), "application/feed+json", null, null);

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.getAdded()).isEqualTo(1);
    RssItem saved = captureSaved().getFirst();
    assertThat(saved.getSourceId()).isEqualTo("json-1");
    assertThat(saved.getSourceIdType()).isEqualTo(SourceIdType.JSON_ID);
    assertThat(saved.getTitle()).isEqualTo("J1");
    assertThat(saved.getItemPayload().getDescription()).isEqualTo("hello");
    assertThat(saved.getPubDate()).isEqualTo(LocalDateTime.of(2024, 1, 2, 15, 4, 5));
  }

  @Test
  void jsonFeedWithoutItemsArrayIsIgnored() throws Exception {
    stubResponse(200, "{\"title\":\"no items\"}".getBytes(StandardCharsets.UTF_8), "application/json", null, null);

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.isOk()).isTrue();
    assertThat(result.getSeen()).isZero();
    verifyNoInteractions(rssItemRepository);
  }

  @Test
  void blankBodyIsTreatedAsEmptyFeed() throws Exception {
    stubXml(200, "");

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.isOk()).isTrue();
    assertThat(result.getSeen()).isZero();
    verifyNoInteractions(rssItemRepository);
  }

  @Test
  void rejectsOversizedFeed() throws Exception {
    stubResponse(200, new byte[MAX_FEED_BYTES + 1], "application/xml", null, null);

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.isOk()).isFalse();
    assertThat(result.getError()).isEqualTo("Feed is too large");
    verify(feedHealthService).recordFailure(USER_ID, "rss-1", "FETCH_ERROR", "Feed is too large");
  }

  @Test
  void recordsFetchErrorOnTransportFailure() throws Exception {
    when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenThrow(new IOException("connection reset"));

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.isOk()).isFalse();
    assertThat(result.getError()).isEqualTo("connection reset");
    verify(feedHealthService).recordFailure(USER_ID, "rss-1", "FETCH_ERROR", "connection reset");
  }

  @Test
  void storesValidatorsFromResponseOnSuccess() throws Exception {
    stubXml(200, rssXml(itemXml("First", "https://example.com/1", "guid-1", "Mon, 02 Jan 2006 15:04:05 GMT", "d")),
        "\"etag-2\"", "Tue, 03 Jan 2006 15:04:05 GMT");

    RssLoadResult result = service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(result.isOk()).isTrue();
    ArgumentCaptor<LocalDateTime> fetchedAt = ArgumentCaptor.forClass(LocalDateTime.class);
    verify(feedHealthService).recordSuccess(eq(USER_ID), eq("rss-1"), eq("\"etag-2\""),
        eq("Tue, 03 Jan 2006 15:04:05 GMT"), fetchedAt.capture());
    assertThat(rss.getLastFetchedAt()).isEqualTo(fetchedAt.getValue());
  }

  @Test
  void fetchesIconOnlyWhenFeedHasNone() throws Exception {
    rss.setIcon(null);
    when(faviconService.fetchIcon(FEED_URL)).thenReturn("https://example.com/favicon.ico");
    stubXml(200, rssXml(itemXml("First", "https://example.com/1", "guid-1", "Mon, 02 Jan 2006 15:04:05 GMT", "d")));

    service.loadRss(USER_ID, GROUP_UUID, rss);

    verify(feedHealthService).updateIcon(USER_ID, "rss-1", "https://example.com/favicon.ico");
    assertThat(rss.getIcon()).isEqualTo("https://example.com/favicon.ico");
  }

  @Test
  void keepsExistingIcon() throws Exception {
    stubXml(200, rssXml(itemXml("First", "https://example.com/1", "guid-1", "Mon, 02 Jan 2006 15:04:05 GMT", "d")));

    service.loadRss(USER_ID, GROUP_UUID, rss);

    verifyNoInteractions(faviconService);
  }

  @Test
  void storesNewestItemFirst() throws Exception {
    stubXml(200, rssXml(
        itemXml("Older", "https://example.com/1", "guid-old", "Mon, 02 Jan 2006 15:04:05 GMT", "d"),
        itemXml("Newer", "https://example.com/2", "guid-new", "Fri, 06 Jan 2006 15:04:05 GMT", "d")));

    service.loadRss(USER_ID, GROUP_UUID, rss);

    assertThat(captureSaved().getFirst().getSourceId()).isEqualTo("guid-new");
  }

  @Test
  void delegatesExpiredItemCleanup() {
    LocalDateTime cutoff = LocalDateTime.now().minusDays(3);

    service.setReadStatusForExpiredItems(USER_ID, cutoff);
    service.deleteForExpiredItems(USER_ID, cutoff);

    verify(rssItemRepository).setStatusByUserIdAndStatusAndPubDate(USER_ID, cutoff);
    verify(rssItemRepository).deleteByUserIdAndStatusAndPubDate(USER_ID, cutoff);
  }

  private void stubXml(int status, String xml) throws Exception {
    stubXml(status, xml, null, null);
  }

  private void stubXml(int status, String xml, String etag, String lastModified) throws Exception {
    stubResponse(status, xml.getBytes(StandardCharsets.UTF_8), "application/rss+xml;charset=UTF-8",
        etag, lastModified);
  }

  @SuppressWarnings("unchecked")
  private void stubResponse(int status, byte[] body, String contentType, String etag, String lastModified)
      throws Exception {
    HttpResponse<byte[]> response = mock(HttpResponse.class);
    HttpHeaders headers = mock(HttpHeaders.class);
    when(headers.firstValue("ETag")).thenReturn(Optional.ofNullable(etag));
    when(headers.firstValue("Last-Modified")).thenReturn(Optional.ofNullable(lastModified));
    when(headers.firstValue("Content-Type")).thenReturn(Optional.ofNullable(contentType));
    when(response.headers()).thenReturn(headers);
    lenient().when(response.statusCode()).thenReturn(status);
    when(response.body()).thenReturn(body);
    when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
  }

  private List<RssItem> captureSaved() {
    ArgumentCaptor<RssItem> captor = ArgumentCaptor.forClass(RssItem.class);
    verify(rssItemRepository, atLeastOnce()).save(captor.capture());
    return captor.getAllValues();
  }

  private static String rssXml(String... items) {
    return """
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel><title>Example</title>
        <link>https://example.com</link><description>Example feed</description>
        %s
        </channel></rss>
        """.formatted(String.join("\n", items));
  }

  private static String itemXml(String title, String link, String guid, String pubDate, String description) {
    return """
        <item><title>%s</title><link>%s</link><guid isPermaLink="false">%s</guid>
        <pubDate>%s</pubDate><description>%s</description></item>
        """.formatted(title, link, guid, pubDate, description);
  }

  private static String itemXmlWithoutGuid(String title, String link, String pubDate, String description) {
    return """
        <item><title>%s</title><link>%s</link>
        <pubDate>%s</pubDate><description>%s</description></item>
        """.formatted(title, link, pubDate, description);
  }
}
