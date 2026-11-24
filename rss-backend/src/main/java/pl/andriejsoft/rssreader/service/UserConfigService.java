package pl.andriejsoft.rssreader.service;

import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import pl.andriejsoft.rssreader.dto.AppConfigDto;
import pl.andriejsoft.rssreader.dto.UserConfigDto;
import pl.andriejsoft.rssreader.dto.UserDto;
import pl.andriejsoft.rssreader.entity.AppConfigEntity;
import pl.andriejsoft.rssreader.entity.UserConfigEntity;
import pl.andriejsoft.rssreader.entity.model.Group;
import pl.andriejsoft.rssreader.entity.model.RssConfig;
import pl.andriejsoft.rssreader.entity.model.UserConfigPayload;
import pl.andriejsoft.rssreader.entity.model.UserSettingsPayload;
import pl.andriejsoft.rssreader.mapper.UserConfigMapper;
import pl.andriejsoft.rssreader.repository.UserConfigRepository;

@Service
public class UserConfigService {

  @Autowired
  private UserConfigRepository userConfigRepository;

  @Autowired
  private AppConfigService appConfigService;

  @Autowired
  private UserConfigMapper userConfigMapper;

  public List<UserConfigDto> findConfigAll() {
    return userConfigMapper.mapToDtoList((List<UserConfigEntity>) userConfigRepository.findAll());
  }

  public UserConfigDto findConfigById(Long id) {
    return userConfigRepository.findById(id).map(i -> userConfigMapper.mapToDto(i)).orElse(null);
  }

  public UserConfigEntity saveConfig(UserConfigDto config) {
    return userConfigRepository.save(userConfigMapper.mapToEntity(config));
  }

  public void deleteConfigById(Long id) {
    userConfigRepository.deleteById(id);
  }

  public UserSettingsPayload findSettingsById(Long id) {
    return userConfigRepository.findById(id)
        .map(this::settingsFromEntity)
        .orElse(null);
  }

  @CacheEvict(value = "config", allEntries = true)
  public UserSettingsPayload saveSettings(Long id, UserSettingsPayload settings) {
    return userConfigRepository.findById(id)
        .map(entity -> {
          UserConfigPayload payload = entity.getUserConfigPayload();
          if (payload == null) {
            payload = UserConfigPayload.builder().build();
          }
          payload.setSettings(settings == null ? UserSettingsPayload.builder().build() : settings);
          entity.setUserConfigPayload(payload);
          return userConfigRepository.save(entity);
        })
        .map(this::settingsFromEntity)
        .orElse(null);
  }

  public List<UserDto> findUserAll() {
    return ((List<UserConfigEntity>) userConfigRepository.findAll()).stream()
        .map(i -> UserDto.builder()
            .id(i.getId())
            .userName(i.getUserName())
            .build()).toList();
  }

  @Cacheable("config")
  public UserConfigDto getCurrentUserConfig() {
    AppConfigDto appConfig = appConfigService.getConfig();
    return userConfigRepository.findById(appConfig.getAppConfigPayload().getDefaultUserId())
        .map(i -> userConfigMapper.mapToDto(i)).orElse(null);
  }

  @CacheEvict(value = "config", allEntries = true)
  public UserDto createNewUser(UserDto userDto) {

    return Optional.of(userConfigRepository.save(UserConfigEntity.builder()
            .userName(userDto.getUserName())
            .userConfigPayload(UserConfigPayload.builder()
                .defaultCronExpression("0 */15 * ? * *")
                .groups(List.of(Group.builder()
                    .name("DEFAULT")
                    .build()))
                .build())
            .build()))
        .map(i -> UserDto.builder()
            .id(i.getId())
            .userName(i.getUserName())
            .build()).orElse(null);
  }

  @CacheEvict(value = "config", allEntries = true)
  public UserDto updateUser(UserDto userDto) {
    return userConfigRepository.findById(userDto.getId())
        .map(entity -> {
          entity.setUserName(userDto.getUserName());
          return userConfigRepository.save(entity);
        })
        .map(i -> UserDto.builder()
            .id(i.getId())
            .userName(i.getUserName())
            .build()).orElse(null);
  }

  public Optional<RssConfig> findRssConfig(Long userId, String rssUuid) {
    return userConfigRepository.findById(userId)
        .map(UserConfigEntity::getUserConfigPayload)
        .filter(payload -> payload != null && payload.getGroups() != null)
        .flatMap(payload -> payload.getGroups().stream()
            .filter(group -> group.getRssConfigs() != null)
            .flatMap(group -> group.getRssConfigs().stream())
            .filter(rss -> rssUuid != null && rssUuid.equals(rss.getUuid()))
            .findFirst());
  }

  @CacheEvict(value = "config", allEntries = true)
  public Optional<RssConfig> updateRssConfig(Long userId, String rssUuid, Consumer<RssConfig> mutator) {
    return userConfigRepository.findById(userId)
        .flatMap(entity -> {
          UserConfigPayload payload = entity.getUserConfigPayload();
          if (payload == null) {
            payload = UserConfigPayload.builder().build();
          }
          Optional<RssConfig> rss = payload.getGroups().stream()
              .filter(group -> group.getRssConfigs() != null)
              .flatMap(group -> group.getRssConfigs().stream())
              .filter(rssConfig -> rssUuid != null && rssUuid.equals(rssConfig.getUuid()))
              .findFirst();
          rss.ifPresent(mutator);
          entity.setUserConfigPayload(payload);
          userConfigRepository.save(entity);
          return rss;
        });
  }

  private UserSettingsPayload settingsFromEntity(UserConfigEntity entity) {
    UserConfigPayload payload = entity.getUserConfigPayload();
    if (payload == null) {
      return UserSettingsPayload.builder().build();
    }
    if (payload.getSettings() == null) {
      payload.setSettings(UserSettingsPayload.builder().build());
    }
    return payload.getSettings();
  }
}
