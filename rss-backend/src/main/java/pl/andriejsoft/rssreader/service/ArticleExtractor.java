package pl.andriejsoft.rssreader.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArticleExtractor {

  private static final Duration TIMEOUT = Duration.ofSeconds(15);
  private static final String USER_AGENT = "Mozilla/5.0 RssReader/2.0";
  private static final int MAX_PARAGRAPHS = 60;
  private static final int MAX_CHARS = 16_000;
  private static final int MIN_PARAGRAPH_CHARS = 40;

  private final HttpClient httpClient;

  public ExtractionResult extract(String url) {
    if (!StringUtils.hasText(url)) {
      return ExtractionResult.builder().error("URL is empty").build();
    }
    try {
      HttpRequest request = HttpRequest.newBuilder(URI.create(url))
          .timeout(TIMEOUT)
          .header("User-Agent", USER_AGENT)
          .header("Accept", "text/html,application/xhtml+xml")
          .GET()
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        return ExtractionResult.builder().error("HTTP " + response.statusCode()).build();
      }
      Document document = Jsoup.parse(response.body(), url);
      document.select("script, style, noscript, iframe, svg, nav, footer, header, aside, form, [aria-hidden=true]")
          .remove();

      Element root = first(document, "article", "main", "[role=main]", ".post-content", ".article-body",
          ".entry-content", "#content", "body");
      List<String> paragraphs = new ArrayList<>();
      int total = 0;
      boolean truncated = false;

      for (Element element : root.select("p, h1, h2, h3, h4, li")) {
        String text = element.text().trim();
        if (text.length() < MIN_PARAGRAPH_CHARS) {
          continue;
        }
        if (total + text.length() > MAX_CHARS) {
          int remaining = MAX_CHARS - total;
          if (remaining > MIN_PARAGRAPH_CHARS) {
            paragraphs.add(text.substring(0, remaining));
          }
          truncated = true;
          break;
        }
        paragraphs.add(text);
        total += text.length();
        if (paragraphs.size() >= MAX_PARAGRAPHS) {
          truncated = true;
          break;
        }
      }

      return ExtractionResult.builder()
          .title(document.title())
          .text(String.join("\n\n", paragraphs))
          .paragraphs(paragraphs.size())
          .truncated(truncated)
          .build();
    } catch (Exception e) {
      log.debug("Full-text extraction failed for {}", url, e);
      return ExtractionResult.builder().error(e.getMessage()).build();
    }
  }

  private Element first(Document document, String... selectors) {
    for (String selector : selectors) {
      Element element = document.selectFirst(selector);
      if (element != null) {
        return element;
      }
    }
    return document.body();
  }

  @Value
  @Builder
  public static class ExtractionResult {

    String title;
    String text;
    int paragraphs;
    boolean truncated;
    String error;
  }
}
