package pl.andriejsoft.rssreader.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.transaction.annotation.Transactional;
import pl.andriejsoft.rssreader.entity.RssItem;
import pl.andriejsoft.rssreader.entity.RssItemProjection;
import pl.andriejsoft.rssreader.enums.RssItemStatus;

public interface RssItemRepository extends CrudRepository<RssItem, Long> {

  List<RssItem> findByUserIdAndGroupUuidAndStatus(Long userId, String groupUuid,
      RssItemStatus status);

  Optional<RssItem> findByLink(String link);

  Optional<RssItem> findByUserIdAndRssUuidAndSourceId(Long userId, String rssUuid, String sourceId);

  Optional<RssItem> findByUserIdAndRssUuidAndLink(Long userId, String rssUuid, String link);

  long countByUserIdAndRssUuid(Long userId, String rssUuid);

  long countByUserId(Long userId);

  long countByUserIdAndStatus(Long userId, RssItemStatus status);

  List<RssItemProjection> getByUserIdAndGroupUuidAndStatus(Long userId, String groupUuid,
      RssItemStatus status);

  List<RssItemProjection> getByUserIdAndStatus(Long userId, RssItemStatus status);

  @Modifying
  @Transactional
  @Query("update RssItem u set u.status = 'READ' where u.userId = ?1 and u.pubDate < ?2 and u.status = 'NEW'")
  void setStatusByUserIdAndStatusAndPubDate(Long userId, LocalDateTime pubDate);

  @Modifying
  @Transactional
  @Query("delete RssItem u where u.userId = ?1 and u.status = 'READ' and u.pubDate < ?2")
  void deleteByUserIdAndStatusAndPubDate(Long userId, LocalDateTime pubDate);

  @Modifying
  @Transactional
  @Query("delete RssItem u where u.userId = ?1 and u.rssUuid = ?2 and u.pubDate < ?3")
  void deleteByUserIdAndRssUuidAndPubDateBefore(Long userId, String rssUuid, LocalDateTime pubDate);

  @Modifying
  @Transactional
  @Query("delete RssItem u where u.userId = ?1 and u.pubDate < ?2")
  void deleteAllByUserIdAndPubDateBefore(Long userId, LocalDateTime pubDate);
}
