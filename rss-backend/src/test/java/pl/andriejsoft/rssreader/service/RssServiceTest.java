package pl.andriejsoft.rssreader.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.andriejsoft.rssreader.dto.RssItemDto;
import pl.andriejsoft.rssreader.entity.RssItem;
import pl.andriejsoft.rssreader.entity.model.RssItemPayload;
import pl.andriejsoft.rssreader.enums.RssItemStatus;
import pl.andriejsoft.rssreader.enums.SourceIdType;
import pl.andriejsoft.rssreader.repository.RssItemRepository;

@ExtendWith(MockitoExtension.class)
class RssServiceTest {

  private static final Long ITEM_ID = 42L;
  private static final Long USER_ID = 1L;

  @Mock
  private RssItemRepository rssItemRepository;
  @Mock
  private ReadMarkerService readMarkerService;

  @InjectMocks
  private RssService service;

  @Test
  void getRssItemsByIdReturnsNullWhenMissing() {
    when(rssItemRepository.findById(ITEM_ID)).thenReturn(Optional.empty());

    assertThat(service.getRssItemsById(ITEM_ID)).isNull();
  }

  @Test
  void getRssItemsByIdMapsEntityFields() {
    when(rssItemRepository.findById(ITEM_ID)).thenReturn(Optional.of(item(RssItemStatus.NEW)));

    RssItemDto dto = service.getRssItemsById(ITEM_ID);

    assertThat(dto.getId()).isEqualTo(ITEM_ID);
    assertThat(dto.getUserId()).isEqualTo(USER_ID);
    assertThat(dto.getGroupUuid()).isEqualTo("group-1");
    assertThat(dto.getRssUuid()).isEqualTo("rss-1");
    assertThat(dto.getSourceId()).isEqualTo("guid-1");
    assertThat(dto.getSourceIdType()).isEqualTo(SourceIdType.GUID);
    assertThat(dto.getFeedName()).isEqualTo("Example");
    assertThat(dto.getTitle()).isEqualTo("Title");
    assertThat(dto.getLink()).isEqualTo("https://example.com/1");
    assertThat(dto.getStatus()).isEqualTo(RssItemStatus.NEW);
    assertThat(dto.getDescription()).isEqualTo("description");
  }

  @Test
  void toDtoToleratesMissingPayload() {
    when(rssItemRepository.findById(ITEM_ID)).thenReturn(Optional.of(
        item(RssItemStatus.NEW).toBuilder().itemPayload(null).build()));

    assertThat(service.getRssItemsById(ITEM_ID).getDescription()).isNull();
  }

  @Test
  void setRssStatusToReadPersistsReadAndMarksMarker() {
    stubFindAndSave();

    RssItemDto dto = service.setRssStatusToRead(ITEM_ID);

    assertThat(dto.getStatus()).isEqualTo(RssItemStatus.READ);
    ArgumentCaptor<RssItem> saved = ArgumentCaptor.forClass(RssItem.class);
    verify(rssItemRepository).save(saved.capture());
    assertThat(saved.getValue().getStatus()).isEqualTo(RssItemStatus.READ);
    verify(readMarkerService).markRead(saved.getValue());
    verify(readMarkerService, never()).remove(any(), any(), any());
  }

  @Test
  void setRssStatusToUnreadPersistsNewAndRemovesMarker() {
    stubFindAndSave();

    RssItemDto dto = service.setRssStatusToUnread(ITEM_ID);

    assertThat(dto.getStatus()).isEqualTo(RssItemStatus.NEW);
    verify(readMarkerService).remove(USER_ID, "guid-1", "https://example.com/1");
    verify(readMarkerService, never()).markRead(any());
  }

  @Test
  void deleteRssItemMarksItemRead() {
    stubFindAndSave();

    RssItemDto dto = service.deleteRssItem(ITEM_ID);

    assertThat(dto.getStatus()).isEqualTo(RssItemStatus.READ);
    verify(readMarkerService).markRead(any(RssItem.class));
  }

  @Test
  void restoreRssItemMarksItemUnread() {
    stubFindAndSave();

    RssItemDto dto = service.restoreRssItem(ITEM_ID);

    assertThat(dto.getStatus()).isEqualTo(RssItemStatus.NEW);
    verify(readMarkerService).remove(USER_ID, "guid-1", "https://example.com/1");
  }

  @Test
  void statusChangesOnMissingItemAreNoOps() {
    when(rssItemRepository.findById(ITEM_ID)).thenReturn(Optional.empty());

    assertThat(service.setRssStatusToRead(ITEM_ID)).isNull();
    assertThat(service.setRssStatusToUnread(ITEM_ID)).isNull();
    assertThat(service.deleteRssItem(ITEM_ID)).isNull();
    assertThat(service.restoreRssItem(ITEM_ID)).isNull();

    verify(rssItemRepository, never()).save(any());
    verify(readMarkerService, never()).markRead(any());
    verify(readMarkerService, never()).remove(any(), any(), any());
  }

  @Test
  void listsUseNewStatusOnly() {
    when(rssItemRepository.getByUserIdAndGroupUuidAndStatus(USER_ID, "group-1", RssItemStatus.NEW))
        .thenReturn(List.of());
    when(rssItemRepository.getByUserIdAndStatus(USER_ID, RssItemStatus.NEW)).thenReturn(List.of());

    service.getRssItemsForUserAndGroup(USER_ID, "group-1");
    service.getAllRssByUser(USER_ID);

    verify(rssItemRepository).getByUserIdAndGroupUuidAndStatus(USER_ID, "group-1", RssItemStatus.NEW);
    verify(rssItemRepository).getByUserIdAndStatus(USER_ID, RssItemStatus.NEW);
  }

  @Test
  void getUnreadCountCountsNewItems() {
    when(rssItemRepository.countByUserIdAndStatus(USER_ID, RssItemStatus.NEW)).thenReturn(7L);

    assertThat(service.getUnreadCount(USER_ID).getUnread()).isEqualTo(7L);
  }

  @Test
  void saveDelegatesToRepository() {
    RssItem rssItem = item(RssItemStatus.NEW);
    when(rssItemRepository.save(rssItem)).thenReturn(rssItem);

    assertThat(service.save(rssItem)).isSameAs(rssItem);
    verify(rssItemRepository).save(rssItem);
  }

  private void stubFindAndSave() {
    RssItem found = item(RssItemStatus.NEW);
    when(rssItemRepository.findById(ITEM_ID)).thenReturn(Optional.of(found));
    when(rssItemRepository.save(any(RssItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
  }

  private RssItem item(RssItemStatus status) {
    return RssItem.builder()
        .id(ITEM_ID)
        .userId(USER_ID)
        .groupUuid("group-1")
        .rssUuid("rss-1")
        .itemUuid("guid-1")
        .sourceId("guid-1")
        .sourceIdType(SourceIdType.GUID)
        .feedName("Example")
        .link("https://example.com/1")
        .title("Title")
        .pubDate(LocalDateTime.now())
        .fetchedAt(LocalDateTime.now())
        .status(status)
        .itemPayload(RssItemPayload.builder()
            .title("Title")
            .link("https://example.com/1")
            .description("description")
            .pubDate(LocalDateTime.now())
            .build())
        .build();
  }
}
