package pl.andriejsoft.rssreader.entity;

import java.time.LocalDateTime;
import pl.andriejsoft.rssreader.enums.RssItemStatus;
import pl.andriejsoft.rssreader.enums.SourceIdType;

public interface RssItemProjection {

  Long getId();

  Long getUserId();

  String getGroupUuid();

  String getRssUuid();

  RssItemStatus getStatus();

  String getLink();

  String getTitle();

  LocalDateTime getPubDate();

  String getSourceId();

  SourceIdType getSourceIdType();

  String getFeedName();

  LocalDateTime getFetchedAt();
}