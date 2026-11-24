package pl.andriejsoft.rssreader.service;

import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import pl.andriejsoft.rssreader.dto.AppConfigDto;
import pl.andriejsoft.rssreader.dto.UserConfigDto;
import pl.andriejsoft.rssreader.entity.AppConfigEntity;
import pl.andriejsoft.rssreader.exception.RssReaderException;
import pl.andriejsoft.rssreader.mapper.AppConfigMapper;
import pl.andriejsoft.rssreader.repository.ReadMarkerRepository;
import pl.andriejsoft.rssreader.repository.RssItemRepository;

@Service
public class UserFacadeService {

  @Autowired
  private UserConfigService userConfigService;

  @Autowired
  private AppConfigService appConfigService;

  @Autowired
  private DynamicScheduler dynamicScheduler;

  @Autowired
  private AppConfigMapper appConfigMapper;

  @Autowired
  private RssItemRepository rssItemRepository;

  @Autowired
  private ReadMarkerRepository readMarkerRepository;

  public void saveConfig(UserConfigDto config) {
    userConfigService.saveConfig(config);
    AppConfigDto appConfig = appConfigService.getConfig();
    if (Objects.equals(appConfig.getAppConfigPayload().getDefaultUserId(), config.getId())) {
      dynamicScheduler.startSchedulersForCurrentUser();
    }
  }

  public void deleteConfigById(Long userId) {
    AppConfigDto appConfig = appConfigService.getConfig();
    if (appConfig.getAppConfigPayload().getDefaultUserId().equals(userId)) {
      throw new RssReaderException("You can't delete this config, this is current user!");
    } else {
      rssItemRepository.deleteAllByUserId(userId);
      readMarkerRepository.deleteByUserId(userId);
      userConfigService.deleteConfigById(userId);
    }
  }

  @CacheEvict(value = "config", allEntries = true)
  public AppConfigDto setCurrentUser(Long userId) {
    UserConfigDto userConfig = userConfigService.findConfigById(userId);
    if (userConfig != null) {
      AppConfigEntity appConfigEntity = appConfigService.getAppConfig();
      appConfigEntity.getAppConfigPayload().setDefaultUserId(userId);
      appConfigService.save(appConfigEntity);
      dynamicScheduler.startSchedulersForCurrentUser();
      return appConfigService.getConfig();
    } else {
      throw new RssReaderException(
          "UserId: " + userId + " is not exist!");
    }
  }
}
