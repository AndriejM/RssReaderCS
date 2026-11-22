package pl.andriejsoft.rssreader.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.andriejsoft.rssreader.enums.SourceIdType;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
@Entity
@Table(name = "read_marker")
public class ReadMarker {

  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "global_sequence")
  @SequenceGenerator(name = "global_sequence", sequenceName = "global_sequence", allocationSize = 1)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "rss_uuid")
  private String rssUuid;

  @Column(name = "link")
  private String link;

  @Column(name = "source_id")
  private String sourceId;

  @Column(name = "source_id_type")
  @Enumerated(EnumType.STRING)
  private SourceIdType sourceIdType;

  @Column(name = "pub_date")
  private LocalDateTime pubDate;

  @Column(name = "marked_at", nullable = false)
  private LocalDateTime markedAt;
}
