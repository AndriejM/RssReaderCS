package pl.andriejsoft.rssreader.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.andriejsoft.rssreader.dto.UserDto;
import pl.andriejsoft.rssreader.service.UserConfigService;

@RestController
@RequestMapping("/user")
public class UserController {

  @Autowired
  private UserConfigService userConfigService;

  @GetMapping("/find")
  public List<UserDto> find() {
    return userConfigService.findUserAll();
  }

  @PostMapping("/create")
  public UserDto create(@RequestBody UserDto userDto) {
    return userConfigService.createNewUser(userDto);
  }

  @PutMapping("/update")
  public UserDto update(@RequestBody UserDto userDto) {
    return userConfigService.updateUser(userDto);
  }

}
