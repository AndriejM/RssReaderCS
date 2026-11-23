package pl.andriejsoft.rssreader.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.andriejsoft.rssreader.dto.FeedExportDto;
import pl.andriejsoft.rssreader.dto.FeedExportItemDto;
import pl.andriejsoft.rssreader.dto.FeedImportResultDto;
import pl.andriejsoft.rssreader.dto.RssConfigDto;
import pl.andriejsoft.rssreader.dto.UserConfigDto;
import pl.andriejsoft.rssreader.entity.model.Group;
import pl.andriejsoft.rssreader.entity.model.RssConfig;
import pl.andriejsoft.rssreader.entity.model.UserConfigPayload;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

  private static final Long USER_ID = 1L;

  @Mock
  private UserConfigService userConfigService;
  @Mock
  private DynamicScheduler dynamicScheduler;

  @InjectMocks
  private FeedService service;

  @Test
  void listFeedsFlattensGroupsWithFeeds() {
    stubConfig(Group.builder().uuid("g1").name("DEFAULT")
            .rssConfigs(new ArrayList<>(List.of(rss("rss-1", "https://example.com/1")))).build(),
        Group.builder().uuid("g2").name("EMPTY").rssConfigs(null).build(),
        Group.builder().uuid("g3").name("NEWS")
            .rssConfigs(new ArrayList<>(List.of(rss("rss-2", "https://example.com/2")))).build());

    List<RssConfigDto> feeds = service.listFeeds(USER_ID);

    assertThat(feeds).hasSize(2);
    assertThat(feeds).extracting(RssConfigDto::getGroupUuid).containsExactly("g1", "g3");
    assertThat(feeds.getFirst().getUuid()).isEqualTo("rss-1");
    assertThat(feeds.getFirst().getUrl()).isEqualTo("https://example.com/1");
  }

  @Test
  void listFeedsIsEmptyWithoutUserConfig() {
    when(userConfigService.findConfigById(USER_ID)).thenReturn(null);

    assertThat(service.listFeeds(USER_ID)).isEmpty();
  }

  @Test
  void exportTagsItemsWithGroupUuidAndVersion() {
    stubConfig(Group.builder().uuid("g1").name("DEFAULT")
        .rssConfigs(new ArrayList<>(List.of(rss("rss-1", "https://example.com/1")))).build());

    FeedExportDto export = service.export(USER_ID);

    assertThat(export.getVersion()).isEqualTo(1);
    assertThat(export.getFeeds()).hasSize(1);
    assertThat(export.getFeeds().getFirst().getGroupUuid()).isEqualTo("g1");
    assertThat(export.getFeeds().getFirst().getName()).isEqualTo("Feed rss-1");
  }

  @Test
  void importWithoutFeedsDoesNotTouchConfig() {
    FeedImportResultDto result = service.importFeeds(USER_ID, FeedExportDto.builder().feeds(List.of()).build());

    assertThat(result.isOk()).isTrue();
    assertThat(result.getTotal()).isZero();
    verifyNoInteractions(userConfigService, dynamicScheduler);
  }

  @Test
  void importReportsMissingUserConfig() {
    when(userConfigService.findConfigById(USER_ID)).thenReturn(null);

    FeedImportResultDto result = service.importFeeds(USER_ID,
        FeedExportDto.builder().feeds(List.of(item("https://example.com/new"))).build());

    assertThat(result.isOk()).isFalse();
    assertThat(result.getError()).isEqualTo("User config not found");
    verify(userConfigService, never()).saveConfig(any());
  }

  @Test
  void importSkipsBlankAndAlreadyKnownUrls() {
    stubConfig(Group.builder().uuid("g1").name("DEFAULT")
        .rssConfigs(new ArrayList<>(List.of(rss("rss-1", "https://example.com/feed")))).build());

    FeedImportResultDto result = service.importFeeds(USER_ID, FeedExportDto.builder()
        .feeds(Arrays.asList(
            null,
            item("   "),
            item("  HTTPS://Example.com/Feed "),
            item("https://example.com/new")))
        .build());

    assertThat(result.getAdded()).isEqualTo(1);
    assertThat(result.getSkipped()).isEqualTo(3);
    assertThat(result.getTotal()).isEqualTo(4);
    assertThat(savedFeeds()).hasSize(2);
    verify(dynamicScheduler).startSchedulersForCurrentUser();
  }

  @Test
  void importSkipsDuplicatesWithinTheSameBatch() {
    stubConfig(Group.builder().uuid("g1").name("DEFAULT").rssConfigs(new ArrayList<>()).build());

    FeedImportResultDto result = service.importFeeds(USER_ID, FeedExportDto.builder()
        .feeds(List.of(item("https://example.com/new"), item("https://example.com/new")))
        .build());

    assertThat(result.getAdded()).isEqualTo(1);
    assertThat(result.getSkipped()).isEqualTo(1);
    assertThat(savedFeeds()).hasSize(1);
  }

  @Test
  void importCreatesDefaultGroupWhenConfigHasNone() {
    when(userConfigService.findConfigById(USER_ID)).thenReturn(UserConfigDto.builder()
        .id(USER_ID)
        .userConfigPayload(null)
        .build());

    FeedImportResultDto result = service.importFeeds(USER_ID,
        FeedExportDto.builder().feeds(List.of(item("https://example.com/new"))).build());

    assertThat(result.isOk()).isTrue();
    assertThat(result.getAdded()).isEqualTo(1);
    UserConfigDto saved = captureSavedConfig();
    assertThat(saved.getUserConfigPayload().getGroups()).hasSize(1);
    assertThat(saved.getUserConfigPayload().getGroups().getFirst().getName()).isEqualTo("DEFAULT");
    assertThat(saved.getUserConfigPayload().getGroups().getFirst().getRssConfigs()).hasSize(1);
  }

  @Test
  void importRoutesFeedToTargetGroup() {
    Group first = Group.builder().uuid("g1").name("DEFAULT").rssConfigs(new ArrayList<>()).build();
    Group second = Group.builder().uuid("g2").name("NEWS").rssConfigs(new ArrayList<>()).build();
    stubConfig(first, second);

    FeedExportItemDto item = item("https://example.com/new");
    item.setGroupUuid("g2");
    service.importFeeds(USER_ID, FeedExportDto.builder().feeds(List.of(item)).build());

    assertThat(first.getRssConfigs()).isEmpty();
    assertThat(second.getRssConfigs()).hasSize(1);
  }

  @Test
  void importFallsBackToFirstGroupForUnknownUuid() {
    Group first = Group.builder().uuid("g1").name("DEFAULT").rssConfigs(new ArrayList<>()).build();
    stubConfig(first);

    FeedExportItemDto item = item("https://example.com/new");
    item.setGroupUuid("does-not-exist");
    service.importFeeds(USER_ID, FeedExportDto.builder().feeds(List.of(item)).build());

    assertThat(first.getRssConfigs()).hasSize(1);
  }

  @Test
  void importFallsBackToUrlWhenNameIsMissing() {
    stubConfig(Group.builder().uuid("g1").name("DEFAULT").rssConfigs(new ArrayList<>()).build());

    FeedExportItemDto item = item("https://example.com/new");
    item.setName(null);
    service.importFeeds(USER_ID, FeedExportDto.builder().feeds(List.of(item)).build());

    assertThat(savedFeeds().getFirst().getName()).isEqualTo("https://example.com/new");
  }

  private void stubConfig(Group... groups) {
    when(userConfigService.findConfigById(USER_ID)).thenReturn(UserConfigDto.builder()
        .id(USER_ID)
        .userConfigPayload(UserConfigPayload.builder()
            .groups(new ArrayList<>(List.of(groups)))
            .build())
        .build());
  }

  private UserConfigDto captureSavedConfig() {
    ArgumentCaptor<UserConfigDto> captor = ArgumentCaptor.forClass(UserConfigDto.class);
    verify(userConfigService).saveConfig(captor.capture());
    return captor.getValue();
  }

  private List<RssConfig> savedFeeds() {
    return captureSavedConfig().getUserConfigPayload().getGroups().getFirst().getRssConfigs();
  }

  private RssConfig rss(String uuid, String url) {
    return RssConfig.builder().uuid(uuid).name("Feed " + uuid).url(url).build();
  }

  private FeedExportItemDto item(String url) {
    return FeedExportItemDto.builder().name("Feed " + url).url(url).build();
  }
}
