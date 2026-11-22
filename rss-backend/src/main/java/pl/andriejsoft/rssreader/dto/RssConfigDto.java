package pl.andriejsoft.rssreader.dto;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RssConfigDto {

  String groupUuid;
  String uuid;
  String name;
  String url;
  String refreshCronExpression;
  Integer refreshMinutes;
  Integer cleanMinutes;
  String icon;

  LocalDateTime lastCheckedAt;
  LocalDateTime lastOkAt;
  LocalDateTime lastErrorAt;
  String lastErrorCode;
  String lastErrorParams;
  String lastErrorMessage;
  Integer fetchFailureCount;
  LocalDateTime nextRunAt;
  LocalDateTime nextRetryAt;

  String etag;
  String lastModified;
  LocalDateTime lastFetchedAt;
}
