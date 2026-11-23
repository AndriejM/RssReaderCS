package pl.andriejsoft.rssreader.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.andriejsoft.rssreader.entity.ReadMarker;
import pl.andriejsoft.rssreader.entity.RssItem;
import pl.andriejsoft.rssreader.enums.SourceIdType;
import pl.andriejsoft.rssreader.repository.ReadMarkerRepository;

@ExtendWith(MockitoExtension.class)
class ReadMarkerServiceTest {

  private static final Long USER_ID = 42L;

  @Mock
  private ReadMarkerRepository readMarkerRepository;

  @InjectMocks
  private ReadMarkerService service;

  @Test
  void isReadIsFalseWithoutUserId() {
    assertThat(service.isRead(null, "src", "link")).isFalse();
    verifyNoInteractions(readMarkerRepository);
  }

  @Test
  void isReadMatchesBySourceIdFirst() {
    when(readMarkerRepository.existsByUserIdAndSourceId(USER_ID, "src")).thenReturn(true);

    assertThat(service.isRead(USER_ID, "src", "https://example.com/a")).isTrue();
    verify(readMarkerRepository, never()).existsByUserIdAndLink(anyLong(), anyString());
  }

  @Test
  void isReadFallsBackToLink() {
    when(readMarkerRepository.existsByUserIdAndSourceId(USER_ID, "src")).thenReturn(false);
    when(readMarkerRepository.existsByUserIdAndLink(USER_ID, "https://example.com/a")).thenReturn(true);

    assertThat(service.isRead(USER_ID, "src", "https://example.com/a")).isTrue();
  }

  @Test
  void isReadSkipsBlankIdentifiers() {
    assertThat(service.isRead(USER_ID, null, null)).isFalse();
    assertThat(service.isRead(USER_ID, "  ", "  ")).isFalse();
    verifyNoInteractions(readMarkerRepository);
  }

  @Test
  void markReadIsNoOpForNullOrItemWithoutUser() {
    assertThat(service.markRead(null)).isNull();
    assertThat(service.markRead(RssItem.builder().link("https://example.com/a").build())).isNull();
    verifyNoInteractions(readMarkerRepository);
  }

  @Test
  void markReadIsNoOpWithoutAnyIdentifier() {
    assertThat(service.markRead(RssItem.builder().userId(USER_ID).build())).isNull();
    verifyNoInteractions(readMarkerRepository);
  }

  @Test
  void markReadIsNoOpWhenAlreadyRead() {
    when(readMarkerRepository.existsByUserIdAndLink(USER_ID, "https://example.com/a")).thenReturn(true);

    assertThat(service.markRead(item("https://example.com/a"))).isNull();
    verify(readMarkerRepository, never()).save(any());
  }

  @Test
  void markReadFallsBackToLinkAsSourceId() {
    RssItem rssItem = item("https://example.com/a").toBuilder().sourceId(null).build();

    service.markRead(rssItem);

    ReadMarker saved = captureSaved();
    assertThat(saved.getSourceId()).isEqualTo("https://example.com/a");
    assertThat(saved.getLink()).isEqualTo("https://example.com/a");
    assertThat(saved.getUserId()).isEqualTo(USER_ID);
    assertThat(saved.getMarkedAt()).isNotNull();
  }

  @Test
  void markReadKeepsRealSourceId() {
    service.markRead(item("https://example.com/a"));

    ReadMarker saved = captureSaved();
    assertThat(saved.getSourceId()).isEqualTo("guid-1");
    assertThat(saved.getSourceIdType()).isEqualTo(SourceIdType.GUID);
    assertThat(saved.getRssUuid()).isEqualTo("rss-1");
  }

  @Test
  void removeDeletesBothIdentifiers() {
    service.remove(USER_ID, "guid-1", "https://example.com/a");

    verify(readMarkerRepository).deleteByUserIdAndSourceId(USER_ID, "guid-1");
    verify(readMarkerRepository).deleteByUserIdAndLink(USER_ID, "https://example.com/a");
  }

  @Test
  void removeIsNoOpWithoutUserId() {
    service.remove(null, "guid-1", "link");

    verifyNoInteractions(readMarkerRepository);
  }

  @Test
  void removeSkipsBlankIdentifiers() {
    service.remove(USER_ID, null, "https://example.com/a");

    verify(readMarkerRepository, never()).deleteByUserIdAndSourceId(anyLong(), anyString());
    verify(readMarkerRepository).deleteByUserIdAndLink(USER_ID, "https://example.com/a");
  }

  @Test
  void forgetDeletesAllMarkersOfUser() {
    service.forget(USER_ID);

    verify(readMarkerRepository).deleteByUserId(USER_ID);
  }

  @Test
  void purgeExpiredUsesTtlWindow() {
    LocalDateTime before = LocalDateTime.now().minusDays(7);

    service.purgeExpired(USER_ID, 7);

    ArgumentCaptor<LocalDateTime> captor = ArgumentCaptor.forClass(LocalDateTime.class);
    verify(readMarkerRepository).deleteByUserIdAndMarkedAtBefore(eq(USER_ID), captor.capture());
    assertThat(captor.getValue()).isBetween(before.minusMinutes(1), LocalDateTime.now().minusDays(7).plusMinutes(1));
  }

  @Test
  void purgeExpiredIsNoOpForNonPositiveTtl() {
    service.purgeExpired(USER_ID, 0);
    service.purgeExpired(USER_ID, -1);
    service.purgeExpired(null, 7);

    verifyNoInteractions(readMarkerRepository);
  }

  @Test
  void trimKeepsNewestThousandMarkers() {
    when(readMarkerRepository.findByUserIdOrderByMarkedAtDesc(USER_ID)).thenReturn(markers(1000));

    service.trim(USER_ID);

    verify(readMarkerRepository, never()).deleteAll(any(Iterable.class));
  }

  @Test
  void trimDeletesOverflow() {
    List<ReadMarker> all = markers(1005);
    when(readMarkerRepository.findByUserIdOrderByMarkedAtDesc(USER_ID)).thenReturn(all);

    service.trim(USER_ID);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<Iterable<ReadMarker>> captor = ArgumentCaptor.forClass(Iterable.class);
    verify(readMarkerRepository).deleteAll(captor.capture());
    assertThat(captor.getValue()).containsExactlyElementsOf(all.subList(1000, 1005));
  }

  @Test
  void trimIsNoOpWithoutUserId() {
    service.trim(null);

    verifyNoInteractions(readMarkerRepository);
  }

  private RssItem item(String link) {
    return RssItem.builder()
        .userId(USER_ID)
        .rssUuid("rss-1")
        .sourceId("guid-1")
        .sourceIdType(SourceIdType.GUID)
        .link(link)
        .pubDate(LocalDateTime.now())
        .build();
  }

  private ReadMarker captureSaved() {
    ArgumentCaptor<ReadMarker> captor = ArgumentCaptor.forClass(ReadMarker.class);
    verify(readMarkerRepository).save(captor.capture());
    return captor.getValue();
  }

  private static List<ReadMarker> markers(int count) {
    return IntStream.range(0, count)
        .mapToObj(i -> ReadMarker.builder().id((long) i).userId(USER_ID).markedAt(LocalDateTime.now()).build())
        .toList();
  }
}
