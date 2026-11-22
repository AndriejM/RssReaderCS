package pl.andriejsoft.rssreader.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class FaviconService {

  private static final Duration TIMEOUT = Duration.ofSeconds(8);
  private static final String USER_AGENT = "RssReader/2.0";

  private final HttpClient httpClient;

  public String fetchIcon(String feedUrl) {
    if (!StringUtils.hasText(feedUrl)) {
      return null;
    }
    try {
      HttpRequest request = HttpRequest.newBuilder(URI.create(feedUrl))
          .timeout(TIMEOUT)
          .header("User-Agent", USER_AGENT)
          .header("Accept", "text/html,application/xhtml+xml")
          .GET()
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        return fallbackIcon(feedUrl);
      }
      Document document = Jsoup.parse(response.body(), feedUrl);
      List<Element> icons = document.select("link[rel~=icon], link[rel=shortcut icon], link[rel=mask-icon]");
      for (Element icon : icons) {
        String href = icon.attr("abs:href");
        if (StringUtils.hasText(href)) {
          return href;
        }
      }
      return fallbackIcon(feedUrl);
    } catch (Exception e) {
      log.debug("Favicon lookup failed for {}", feedUrl, e);
      return fallbackIcon(feedUrl);
    }
  }

  private String fallbackIcon(String feedUrl) {
    try {
      URI uri = URI.create(feedUrl);
      if (uri.getScheme() == null || uri.getHost() == null) {
        return null;
      }
      return uri.getScheme() + "://" + uri.getHost() + "/favicon.ico";
    } catch (Exception e) {
      return null;
    }
  }
}
