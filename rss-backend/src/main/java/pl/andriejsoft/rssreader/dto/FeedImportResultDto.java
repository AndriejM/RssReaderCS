package pl.andriejsoft.rssreader.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedImportResultDto {

  boolean ok;
  int added;
  int skipped;
  int total;
  String error;
}
