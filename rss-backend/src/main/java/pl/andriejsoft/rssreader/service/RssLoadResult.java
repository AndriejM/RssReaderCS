package pl.andriejsoft.rssreader.service;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RssLoadResult {

  boolean ok;
  int added;
  int skipped;
  int seen;
  boolean notModified;
  boolean busy;
  String error;
}
