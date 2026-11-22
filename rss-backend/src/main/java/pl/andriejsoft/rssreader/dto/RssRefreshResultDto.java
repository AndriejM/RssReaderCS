package pl.andriejsoft.rssreader.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RssRefreshResultDto {

  boolean ok;
  String rssUuid;
  String name;
  int added;
  int skipped;
  int seen;
  boolean notModified;
  boolean busy;
  String error;
}
