package pl.andriejsoft.rssreader.service;

import java.time.LocalDateTime;
import pl.andriejsoft.rssreader.enums.SourceIdType;

public record FeedEntry(
    String sourceId,
    SourceIdType sourceIdType,
    String link,
    String title,
    LocalDateTime pubDate,
    String description) {

}
