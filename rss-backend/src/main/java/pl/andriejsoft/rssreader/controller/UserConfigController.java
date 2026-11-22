package pl.andriejsoft.rssreader.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.andriejsoft.rssreader.dto.UserConfigDto;
import pl.andriejsoft.rssreader.entity.model.UserSettingsPayload;
import pl.andriejsoft.rssreader.service.UserConfigService;
import pl.andriejsoft.rssreader.service.UserFacadeService;

@RestController
@RequestMapping("/user-config")
public class UserConfigController {

  @Autowired
  private UserConfigService userConfigService;

  @Autowired
  private UserFacadeService userFacadeService;

  @GetMapping("/find")
  public List<UserConfigDto> find() {

    return userConfigService.findConfigAll();
  }

  @GetMapping("/find/{id}")
  public UserConfigDto findById(@PathVariable Long id) {

    return userConfigService.findConfigById(id);
  }

  @PostMapping("/save")
  public String save(@RequestBody UserConfigDto config) {
    userFacadeService.saveConfig(config);
    return "Added Successfully";
  }

  @DeleteMapping("/delete/{id}")
  public String deleteById(@PathVariable Long id) {
    userFacadeService.deleteConfigById(id);
    return "Deleted Successfully";
  }

  @GetMapping("/{id}/settings")
  public UserSettingsPayload findSettings(@PathVariable Long id) {
    return userConfigService.findSettingsById(id);
  }

  @PutMapping("/{id}/settings")
  public UserSettingsPayload saveSettings(@PathVariable Long id,
      @RequestBody UserSettingsPayload settings) {
    return userConfigService.saveSettings(id, settings);
  }
}
