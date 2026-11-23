package pl.andriejsoft.rssreader.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.andriejsoft.rssreader.dto.RssRefreshAllResultDto;
import pl.andriejsoft.rssreader.dto.RssRefreshResultDto;
import pl.andriejsoft.rssreader.dto.UserConfigDto;
import pl.andriejsoft.rssreader.entity.model.Group;
import pl.andriejsoft.rssreader.entity.model.RssConfig;
import pl.andriejsoft.rssreader.entity.model.UserConfigPayload;

@ExtendWith(MockitoExtension.class)
class RssRefreshServiceTest {

  private static final Long USER_ID = 1L;
  private static final String GROUP_UUID = "group-1";

  @Mock
  private UserConfigService userConfigService;
  @Mock
  private RssLoaderService rssLoaderService;
  @Mock
  private FeedLockService feedLockService;

  @InjectMocks
  private RssRefreshService service;

  @Test
  void refreshOneReportsUnknownFeed() {
    when(userConfigService.findConfigById(USER_ID)).thenReturn(null);

    RssRefreshResultDto result = service.refreshOne(USER_ID, "missing");

    assertThat(result.isOk()).isFalse();
    assertThat(result.getError()).isEqualTo("Feed not found");
    assertThat(result.getRssUuid()).isEqualTo("missing");
    verifyNoLoad();
  }

  @Test
  void refreshOneLoadsFeedAndReleasesLock() {
    RssConfig rss = rss("rss-1");
    stubConfig(rss);
    when(feedLockService.tryLock("rss-1")).thenReturn(true);
    when(rssLoaderService.loadRss(USER_ID, GROUP_UUID, rss))
        .thenReturn(RssLoadResult.builder().ok(true).added(3).skipped(1).seen(4).build());

    RssRefreshResultDto result = service.refreshOne(USER_ID, "rss-1");

    assertThat(result.isOk()).isTrue();
    assertThat(result.getAdded()).isEqualTo(3);
    assertThat(result.getSkipped()).isEqualTo(1);
    assertThat(result.getSeen()).isEqualTo(4);
    assertThat(result.getName()).isEqualTo("Feed rss-1");
    verify(feedLockService).unlock("rss-1");
  }

  @Test
  void refreshOneReportsBusyWithoutLoading() {
    stubConfig(rss("rss-1"));
    when(feedLockService.isBusy("rss-1")).thenReturn(true);

    RssRefreshResultDto result = service.refreshOne(USER_ID, "rss-1");

    assertThat(result.isBusy()).isTrue();
    assertThat(result.isOk()).isFalse();
    assertThat(result.getError()).isEqualTo("Feed is busy");
    verifyNoLoad();
    verify(feedLockService, never()).unlock(anyString());
  }

  @Test
  void refreshOneReportsBusyWhenLockIsContended() {
    stubConfig(rss("rss-1"));
    when(feedLockService.tryLock("rss-1")).thenReturn(false);

    RssRefreshResultDto result = service.refreshOne(USER_ID, "rss-1");

    assertThat(result.isBusy()).isTrue();
    verify(rssLoaderService, never()).loadRss(any(), any(), any());
    verify(feedLockService, never()).unlock(anyString());
  }

  @Test
  void refreshOneReleasesLockWhenLoaderThrows() {
    RssConfig rss = rss("rss-1");
    stubConfig(rss);
    when(feedLockService.tryLock("rss-1")).thenReturn(true);
    when(rssLoaderService.loadRss(USER_ID, GROUP_UUID, rss)).thenThrow(new IllegalStateException("boom"));

    assertThatThrownBy(() -> service.refreshOne(USER_ID, "rss-1"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("boom");

    verify(feedLockService).unlock("rss-1");
  }

  @Test
  void refreshAllCountsOnlyRealFailures() {
    stubConfig(rss("ok"), rss("busy"), rss("broken"));
    when(feedLockService.isBusy(anyString())).thenReturn(false);
    when(feedLockService.isBusy("busy")).thenReturn(true);
    when(feedLockService.tryLock("ok")).thenReturn(true);
    when(feedLockService.tryLock("broken")).thenReturn(true);
    when(rssLoaderService.loadRss(eq(USER_ID), eq(GROUP_UUID), any(RssConfig.class)))
        .thenAnswer(invocation -> {
          RssConfig rss = invocation.getArgument(2);
          return "broken".equals(rss.getUuid())
              ? RssLoadResult.builder().ok(false).error("HTTP 500").build()
              : RssLoadResult.builder().ok(true).added(1).seen(1).build();
        });

    RssRefreshAllResultDto result = service.refreshAll(USER_ID);

    assertThat(result.getResults()).hasSize(3);
    assertThat(result.getFailed()).isEqualTo(1);
    assertThat(result.isOk()).isFalse();
  }

  @Test
  void refreshAllIsOkWhenFailuresAreOnlyBusy() {
    stubConfig(rss("ok"), rss("busy"));
    when(feedLockService.isBusy(anyString())).thenReturn(false);
    when(feedLockService.isBusy("busy")).thenReturn(true);
    when(feedLockService.tryLock("ok")).thenReturn(true);
    when(rssLoaderService.loadRss(USER_ID, GROUP_UUID, rss("ok")))
        .thenReturn(RssLoadResult.builder().ok(true).build());

    RssRefreshAllResultDto result = service.refreshAll(USER_ID);

    assertThat(result.getFailed()).isZero();
    assertThat(result.isOk()).isTrue();
  }

  @Test
  void refreshAllWithoutFeedsIsOk() {
    when(userConfigService.findConfigById(USER_ID)).thenReturn(null);

    RssRefreshAllResultDto result = service.refreshAll(USER_ID);

    assertThat(result.getResults()).isEmpty();
    assertThat(result.getFailed()).isZero();
    assertThat(result.isOk()).isTrue();
  }

  @Test
  void refreshAllIgnoresGroupsWithoutFeeds() {
    Group empty = Group.builder().uuid("empty").name("EMPTY").rssConfigs(null).build();
    Group withFeeds = Group.builder().uuid(GROUP_UUID).name("DEFAULT")
        .rssConfigs(new ArrayList<>(List.of(rss("rss-1")))).build();
    stubConfig(List.of(empty, withFeeds));
    when(feedLockService.tryLock("rss-1")).thenReturn(true);
    when(rssLoaderService.loadRss(USER_ID, GROUP_UUID, rss("rss-1")))
        .thenReturn(RssLoadResult.builder().ok(true).build());

    RssRefreshAllResultDto result = service.refreshAll(USER_ID);

    assertThat(result.getResults()).hasSize(1);
  }

  private void stubConfig(RssConfig... feeds) {
    stubConfig(List.of(Group.builder().uuid(GROUP_UUID).name("DEFAULT")
        .rssConfigs(new ArrayList<>(List.of(feeds))).build()));
  }

  private void stubConfig(List<Group> groups) {
    when(userConfigService.findConfigById(USER_ID)).thenReturn(UserConfigDto.builder()
        .id(USER_ID)
        .userConfigPayload(UserConfigPayload.builder()
            .groups(new ArrayList<>(groups))
            .build())
        .build());
  }

  private void verifyNoLoad() {
    verify(rssLoaderService, never()).loadRss(any(), any(), any());
    verify(feedLockService, never()).tryLock(anyString());
  }

  private RssConfig rss(String uuid) {
    return RssConfig.builder()
        .uuid(uuid)
        .name("Feed " + uuid)
        .url("https://example.com/" + uuid)
        .build();
  }
}
