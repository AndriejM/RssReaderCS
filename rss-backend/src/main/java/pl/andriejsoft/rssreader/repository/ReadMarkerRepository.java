package pl.andriejsoft.rssreader.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.transaction.annotation.Transactional;
import pl.andriejsoft.rssreader.entity.ReadMarker;

public interface ReadMarkerRepository extends CrudRepository<ReadMarker, Long> {

  boolean existsByUserIdAndSourceId(Long userId, String sourceId);

  boolean existsByUserIdAndLink(Long userId, String link);

  long countByUserId(Long userId);

  List<ReadMarker> findByUserIdOrderByMarkedAtDesc(Long userId);

  @Modifying
  @Transactional
  @Query("delete from ReadMarker m where m.userId = ?1 and m.markedAt < ?2")
  void deleteByUserIdAndMarkedAtBefore(Long userId, LocalDateTime cutoff);

  @Modifying
  @Transactional
  @Query("delete from ReadMarker m where m.userId = ?1 and m.sourceId = ?2")
  void deleteByUserIdAndSourceId(Long userId, String sourceId);

  @Modifying
  @Transactional
  @Query("delete from ReadMarker m where m.userId = ?1 and m.link = ?2")
  void deleteByUserIdAndLink(Long userId, String link);

  @Modifying
  @Transactional
  @Query("delete from ReadMarker m where m.userId = ?1")
  void deleteByUserId(Long userId);
}
