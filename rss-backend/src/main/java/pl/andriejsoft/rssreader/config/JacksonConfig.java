package pl.andriejsoft.rssreader.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pl.andriejsoft.rssreader.utils.CustomObjectMapper;

@Configuration
public class JacksonConfig {

  @Bean
  public ObjectMapper objectMapper() {
    return CustomObjectMapper.objectMapper.copy();
  }
}
