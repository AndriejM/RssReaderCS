package pl.andriejsoft.rssreader.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pl.andriejsoft.rssreader.dto.FeedExportDto;
import pl.andriejsoft.rssreader.dto.FeedImportResultDto;
import pl.andriejsoft.rssreader.dto.RssConfigDto;
import pl.andriejsoft.rssreader.service.FeedService;

@ExtendWith(MockitoExtension.class)
class FeedControllerTest {

  @Mock
  private FeedService feedService;

  @InjectMocks
  private FeedController controller;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

  @Test
  void listEndpointDelegates() throws Exception {
    when(feedService.listFeeds(1L)).thenReturn(List.of(
        RssConfigDto.builder().groupUuid("g1").uuid("rss-1").url("https://example.com/1").build()));

    mockMvc.perform(get("/feeds/1")).andExpect(status().isOk());

    verify(feedService).listFeeds(1L);
  }

  @Test
  void exportEndpointDelegates() throws Exception {
    when(feedService.export(1L)).thenReturn(FeedExportDto.builder().feeds(List.of()).build());

    mockMvc.perform(get("/feeds/export/1")).andExpect(status().isOk());

    verify(feedService).export(1L);
  }

  @Test
  void importEndpointPassesParsedPayload() throws Exception {
    when(feedService.importFeeds(anyLong(), any())).thenReturn(
        FeedImportResultDto.builder().ok(true).added(1).total(1).build());

    mockMvc.perform(post("/feeds/import/1")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"version":1,"feeds":[{"groupUuid":"g1","name":"Example","url":"https://example.com/1"}]}
                """))
        .andExpect(status().isOk());

    ArgumentCaptor<FeedExportDto> payload = ArgumentCaptor.forClass(FeedExportDto.class);
    verify(feedService).importFeeds(org.mockito.Mockito.eq(1L), payload.capture());
    assertThat(payload.getValue().getVersion()).isEqualTo(1);
    assertThat(payload.getValue().getFeeds()).hasSize(1);
    assertThat(payload.getValue().getFeeds().getFirst().getUrl()).isEqualTo("https://example.com/1");
  }

  @Test
  void importWithoutBodyIsRejected() throws Exception {
    mockMvc.perform(post("/feeds/import/1").contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());

    verify(feedService, never()).importFeeds(anyLong(), any());
  }
}
