package pl.andriejsoft.rssreader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedExportItemDto {

  private String groupUuid;
  private String name;
  private String url;
  private String refreshCronExpression;
  private Integer refreshMinutes;
  private Integer cleanMinutes;
  private String icon;
}
