package pl.andriejsoft.rssreader.entity.model;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RssConfig {

  @Builder.Default
  private String uuid = UUID.randomUUID().toString();
  private String name;
  private String url;
  private String refreshCronExpression;
  private String icon;

  private LocalDateTime lastCheckedAt;
  private LocalDateTime lastOkAt;
  private LocalDateTime lastErrorAt;
  private String lastErrorCode;
  private String lastErrorParams;
  private String lastErrorMessage;
  @Builder.Default
  private Integer fetchFailureCount = 0;
  private LocalDateTime nextRunAt;
  private LocalDateTime nextRetryAt;

  private String etag;
  private String lastModified;
  private LocalDateTime lastFetchedAt;
}
