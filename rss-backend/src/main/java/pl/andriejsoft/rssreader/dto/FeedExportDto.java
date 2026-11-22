package pl.andriejsoft.rssreader.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedExportDto {

  @Builder.Default
  private Integer version = 1;
  @Builder.Default
  private List<FeedExportItemDto> feeds = List.of();
}
