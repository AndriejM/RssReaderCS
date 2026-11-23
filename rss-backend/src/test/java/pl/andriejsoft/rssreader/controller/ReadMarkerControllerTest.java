package pl.andriejsoft.rssreader.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pl.andriejsoft.rssreader.service.ReadMarkerService;

@ExtendWith(MockitoExtension.class)
class ReadMarkerControllerTest {

  @Mock
  private ReadMarkerService readMarkerService;

  @InjectMocks
  private ReadMarkerController controller;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

  @Test
  void forgetEndpointClearsMarkersForUser() throws Exception {
    mockMvc.perform(delete("/read-markers/1"))
        .andExpect(status().isOk())
        .andExpect(content().string("Read markers forgotten"));

    org.mockito.Mockito.verify(readMarkerService).forget(1L);
  }
}
