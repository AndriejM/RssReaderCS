package pl.andriejsoft.rssreader.dto;

import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RssRefreshAllResultDto {

  boolean ok;
  int failed;
  List<RssRefreshResultDto> results;
}
