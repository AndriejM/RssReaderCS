package pl.andriejsoft.rssreader.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RssFullTextDto {

  Long id;
  String link;
  String title;
  String text;
  int paragraphs;
  boolean truncated;
  String error;
}
