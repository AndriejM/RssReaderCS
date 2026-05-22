package pl.andriejsoft.rssreader.mapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import pl.andriejsoft.rssreader.dto.AppConfigDto;
import pl.andriejsoft.rssreader.entity.AppConfigEntity;
import pl.andriejsoft.rssreader.entity.UserConfigEntity;

@Component
public class AppConfigMapper {

  @Autowired UserConfigMapper userConfigMapper;

  public AppConfigDto mapToDto(AppConfigEntity appConfigEntity) {
    if (appConfigEntity == null) {
      return null;
    }
    return AppConfigDto.builder()
        .id(appConfigEntity.getId())
        .appConfigPayload(appConfigEntity.getAppConfigPayload())
        .build();
  }

  public AppConfigEntity mapToEntity(AppConfigDto appConfigDto) {
    if (appConfigDto == null) {
      return null;
    }
    return AppConfigEntity.builder()
        .id(appConfigDto.getId())
        .appConfigPayload(appConfigDto.getAppConfigPayload())
        .build();
  }
}
