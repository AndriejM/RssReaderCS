package pl.andriejsoft.rssreader.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.andriejsoft.rssreader.service.ReadMarkerService;

@RequestMapping("/read-markers")
@RestController
@RequiredArgsConstructor
public class ReadMarkerController {

  private final ReadMarkerService readMarkerService;

  @DeleteMapping("/{userId}")
  public String forget(@PathVariable Long userId) {
    readMarkerService.forget(userId);
    return "Read markers forgotten";
  }
}
