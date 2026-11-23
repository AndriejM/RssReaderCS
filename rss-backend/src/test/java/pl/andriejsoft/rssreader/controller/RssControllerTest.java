package pl.andriejsoft.rssreader.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pl.andriejsoft.rssreader.dto.RssItemDto;
import pl.andriejsoft.rssreader.dto.RssRefreshAllResultDto;
import pl.andriejsoft.rssreader.dto.RssRefreshResultDto;
import pl.andriejsoft.rssreader.dto.RssUnreadCountDto;
import pl.andriejsoft.rssreader.enums.RssItemStatus;
import pl.andriejsoft.rssreader.service.ArticleExtractor;
import pl.andriejsoft.rssreader.service.RssRefreshService;
import pl.andriejsoft.rssreader.service.RssService;

@ExtendWith(MockitoExtension.class)
class RssControllerTest {

  @Mock
  private RssService rssService;
  @Mock
  private RssRefreshService rssRefreshService;
  @Mock
  private ArticleExtractor articleExtractor;

  @InjectMocks
  private RssController controller;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

  @Test
  void listEndpointsDelegateToService() throws Exception {
    when(rssService.getAllRssByUser(1L)).thenReturn(List.of(item()));
    when(rssService.getRssItemsForUserAndGroup(1L, "group-1")).thenReturn(List.of(item()));

    mockMvc.perform(get("/rss/list/1")).andExpect(status().isOk());
    mockMvc.perform(get("/rss/list/1/group-1")).andExpect(status().isOk());

    verify(rssService).getAllRssByUser(1L);
    verify(rssService).getRssItemsForUserAndGroup(1L, "group-1");
  }

  @Test
  void unreadCountEndpointDelegates() throws Exception {
    when(rssService.getUnreadCount(1L)).thenReturn(RssUnreadCountDto.builder().unread(3L).build());

    mockMvc.perform(get("/rss/unread-count/1")).andExpect(status().isOk());

    verify(rssService).getUnreadCount(1L);
  }

  @Test
  void itemEndpointReturnsItem() throws Exception {
    when(rssService.getRssItemsById(42L)).thenReturn(item());

    mockMvc.perform(get("/rss/rss/42")).andExpect(status().isOk());

    verify(rssService).getRssItemsById(42L);
  }

  @Test
  void itemEndpointReturnsEmptyBodyWhenMissing() throws Exception {
    when(rssService.getRssItemsById(42L)).thenReturn(null);

    mockMvc.perform(get("/rss/rss/42"))
        .andExpect(status().isOk())
        .andExpect(result -> assertThat(result.getResponse().getContentAsString()).isEmpty());
  }

  @Test
  void statusEndpointsDelegateToService() throws Exception {
    when(rssService.setRssStatusToRead(42L)).thenReturn(item());
    when(rssService.setRssStatusToUnread(42L)).thenReturn(item());
    when(rssService.deleteRssItem(42L)).thenReturn(item());
    when(rssService.restoreRssItem(42L)).thenReturn(item());

    mockMvc.perform(put("/rss/rss/42/set-status-read")).andExpect(status().isOk());
    mockMvc.perform(post("/rss/rss/42/mark-read")).andExpect(status().isOk());
    mockMvc.perform(post("/rss/rss/42/mark-unread")).andExpect(status().isOk());
    mockMvc.perform(delete("/rss/rss/42")).andExpect(status().isOk());
    mockMvc.perform(post("/rss/rss/42/restore")).andExpect(status().isOk());

    verify(rssService, org.mockito.Mockito.times(2)).setRssStatusToRead(42L);
    verify(rssService).setRssStatusToUnread(42L);
    verify(rssService).deleteRssItem(42L);
    verify(rssService).restoreRssItem(42L);
  }

  @Test
  void fullTextReportsMissingItemWithoutExtracting() throws Exception {
    when(rssService.getRssItemsById(42L)).thenReturn(null);

    mockMvc.perform(post("/rss/rss/42/full-text")).andExpect(status().isOk());

    verify(articleExtractor, never()).extract(any());
  }

  @Test
  void fullTextDelegatesToExtractor() throws Exception {
    when(rssService.getRssItemsById(42L)).thenReturn(item());
    when(articleExtractor.extract("https://example.com/1")).thenReturn(
        ArticleExtractor.ExtractionResult.builder().title("Post").text("body").paragraphs(1).build());

    mockMvc.perform(post("/rss/rss/42/full-text")).andExpect(status().isOk());

    verify(articleExtractor).extract("https://example.com/1");
  }

  @Test
  void refreshEndpointsDelegate() throws Exception {
    when(rssRefreshService.refreshOne(1L, "rss-1")).thenReturn(
        RssRefreshResultDto.builder().ok(true).rssUuid("rss-1").build());
    when(rssRefreshService.refreshAll(1L)).thenReturn(
        RssRefreshAllResultDto.builder().ok(true).results(List.of()).build());

    mockMvc.perform(post("/rss/refresh/1/rss-1")).andExpect(status().isOk());
    mockMvc.perform(post("/rss/refresh-all/1")).andExpect(status().isOk());

    verify(rssRefreshService).refreshOne(1L, "rss-1");
    verify(rssRefreshService).refreshAll(1L);
  }

  @Test
  void unknownPathIsNotFound() throws Exception {
    mockMvc.perform(get("/rss/unknown")).andExpect(status().isNotFound());

    verify(rssService, never()).getRssItemsById(anyLong());
    verify(rssService, never()).getRssItemsForUserAndGroup(anyLong(), anyString());
  }

  private RssItemDto item() {
    return RssItemDto.builder()
        .id(42L)
        .userId(1L)
        .groupUuid("group-1")
        .rssUuid("rss-1")
        .status(RssItemStatus.NEW)
        .link("https://example.com/1")
        .title("Title")
        .pubDate(LocalDateTime.now())
        .fetchedAt(LocalDateTime.now())
        .build();
  }
}
