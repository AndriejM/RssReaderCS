package pl.andriejsoft.rssreader.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import pl.andriejsoft.rssreader.dto.FeedExportDto;
import pl.andriejsoft.rssreader.dto.FeedExportItemDto;
import pl.andriejsoft.rssreader.dto.FeedImportResultDto;
import pl.andriejsoft.rssreader.dto.RssConfigDto;
import pl.andriejsoft.rssreader.dto.UserConfigDto;
import pl.andriejsoft.rssreader.entity.model.Group;
import pl.andriejsoft.rssreader.entity.model.RssConfig;
import pl.andriejsoft.rssreader.entity.model.UserConfigPayload;

@Service
@RequiredArgsConstructor
public class FeedService {

  private final UserConfigService userConfigService;
  private final DynamicScheduler dynamicScheduler;

  public List<RssConfigDto> listFeeds(Long userId) {
    return findPayload(userId)
        .map(payload -> payload.getGroups().stream()
            .filter(group -> group.getRssConfigs() != null)
            .flatMap(group -> group.getRssConfigs().stream()
                .map(rss -> toDto(group.getUuid(), rss)))
            .toList())
        .orElse(List.of());
  }

  public FeedExportDto export(Long userId) {
    List<FeedExportItemDto> feeds = findPayload(userId)
        .map(payload -> payload.getGroups().stream()
            .filter(group -> group.getRssConfigs() != null)
            .flatMap(group -> group.getRssConfigs().stream()
                .map(rss -> toExportItem(group.getUuid(), rss)))
            .toList())
        .orElse(List.of());
    return FeedExportDto.builder().version(1).feeds(feeds).build();
  }

  public FeedImportResultDto importFeeds(Long userId, FeedExportDto feedExport) {
    if (feedExport == null || feedExport.getFeeds() == null || feedExport.getFeeds().isEmpty()) {
      return FeedImportResultDto.builder().ok(true).total(0).build();
    }
    UserConfigDto config = userConfigService.findConfigById(userId);
    if (config == null) {
      return FeedImportResultDto.builder().ok(false).error("User config not found").build();
    }
    UserConfigPayload payload = config.getUserConfigPayload();
    if (payload == null) {
      payload = UserConfigPayload.builder().build();
    }
    if (payload.getGroups() == null || payload.getGroups().isEmpty()) {
      payload.setGroups(new ArrayList<>(List.of(Group.builder().name("DEFAULT").build())));
    }

    List<String> existingLinks = new ArrayList<>(payload.getGroups().stream()
        .filter(group -> group.getRssConfigs() != null)
        .flatMap(group -> group.getRssConfigs().stream())
        .map(RssConfig::getUrl)
        .filter(StringUtils::hasText)
        .map(this::normalizeUrl)
        .toList());

    int added = 0;
    int skipped = 0;
    for (FeedExportItemDto item : feedExport.getFeeds()) {
      if (item == null || !StringUtils.hasText(item.getUrl())) {
        skipped++;
        continue;
      }
      String normalized = normalizeUrl(item.getUrl());
      if (existingLinks.contains(normalized)) {
        skipped++;
        continue;
      }
      Group targetGroup = findGroup(payload, item.getGroupUuid());
      RssConfig rss = RssConfig.builder()
          .uuid(UUID.randomUUID().toString())
          .name(StringUtils.hasText(item.getName()) ? item.getName() : item.getUrl())
          .url(item.getUrl())
          .refreshCronExpression(item.getRefreshCronExpression())
          .refreshMinutes(item.getRefreshMinutes())
          .cleanMinutes(item.getCleanMinutes())
          .icon(item.getIcon())
          .build();
      targetGroup.getRssConfigs().add(rss);
      existingLinks.add(normalized);
      added++;
    }

    config.setUserConfigPayload(payload);
    userConfigService.saveConfig(config);
    dynamicScheduler.startSchedulersForCurrentUser();
    return FeedImportResultDto.builder()
        .ok(true)
        .added(added)
        .skipped(skipped)
        .total(feedExport.getFeeds().size())
        .build();
  }

  private Optional<UserConfigPayload> findPayload(Long userId) {
    return Optional.ofNullable(userConfigService.findConfigById(userId))
        .map(UserConfigDto::getUserConfigPayload);
  }

  private Group findGroup(UserConfigPayload payload, String groupUuid) {
    if (StringUtils.hasText(groupUuid)) {
      Optional<Group> group = payload.getGroups().stream()
          .filter(g -> groupUuid.equals(g.getUuid()))
          .findFirst();
      if (group.isPresent()) {
        return group.get();
      }
    }
    return payload.getGroups().getFirst();
  }

  private RssConfigDto toDto(String groupUuid, RssConfig rss) {
    return RssConfigDto.builder()
        .groupUuid(groupUuid)
        .uuid(rss.getUuid())
        .name(rss.getName())
        .url(rss.getUrl())
        .refreshCronExpression(rss.getRefreshCronExpression())
        .refreshMinutes(rss.getRefreshMinutes())
        .cleanMinutes(rss.getCleanMinutes())
        .icon(rss.getIcon())
        .lastCheckedAt(rss.getLastCheckedAt())
        .lastOkAt(rss.getLastOkAt())
        .lastErrorAt(rss.getLastErrorAt())
        .lastErrorCode(rss.getLastErrorCode())
        .lastErrorParams(rss.getLastErrorParams())
        .lastErrorMessage(rss.getLastErrorMessage())
        .fetchFailureCount(rss.getFetchFailureCount())
        .nextRunAt(rss.getNextRunAt())
        .nextRetryAt(rss.getNextRetryAt())
        .etag(rss.getEtag())
        .lastModified(rss.getLastModified())
        .lastFetchedAt(rss.getLastFetchedAt())
        .build();
  }

  private FeedExportItemDto toExportItem(String groupUuid, RssConfig rss) {
    return FeedExportItemDto.builder()
        .groupUuid(groupUuid)
        .name(rss.getName())
        .url(rss.getUrl())
        .refreshCronExpression(rss.getRefreshCronExpression())
        .refreshMinutes(rss.getRefreshMinutes())
        .cleanMinutes(rss.getCleanMinutes())
        .icon(rss.getIcon())
        .build();
  }

  private String normalizeUrl(String url) {
    return url.trim().toLowerCase(Locale.ROOT);
  }
}
