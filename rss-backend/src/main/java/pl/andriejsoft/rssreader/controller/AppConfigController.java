package pl.andriejsoft.rssreader.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.andriejsoft.rssreader.dto.AppConfigDto;
import pl.andriejsoft.rssreader.service.AppConfigService;
import pl.andriejsoft.rssreader.service.UserFacadeService;

@RestController
@RequestMapping("/app-config")
public class AppConfigController {

  @Autowired
  private AppConfigService appConfigService;

  @Autowired
  private UserFacadeService userFacadeService;

  @GetMapping("/get")
  public AppConfigDto getAppConfig() {
    return appConfigService.getConfig();
  }

  @GetMapping("/set-current-user/{userId}")
  public AppConfigDto setCurrentUserConfig(@PathVariable Long userId) {
    return userFacadeService.setCurrentUser(userId);
  }

  @PostMapping("/save")
  public AppConfigDto save(@RequestBody AppConfigDto appConfigDto) {
    return appConfigService.saveDto(appConfigDto);
  }
}
