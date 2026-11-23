package pl.andriejsoft.rssreader.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ArticleExtractorTest {

  private static final String URL = "https://example.com/post";

  @Mock
  private HttpClient httpClient;

  @InjectMocks
  private ArticleExtractor extractor;

  @Test
  void extractRejectsMissingUrl() {
    assertThat(extractor.extract(null).getError()).isEqualTo("URL is empty");
    assertThat(extractor.extract("   ").getError()).isEqualTo("URL is empty");

    verifyNoInteractions(httpClient);
  }

  @Test
  void extractReportsTransportFailures() throws Exception {
    when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenThrow(new IOException("connection refused"));

    assertThat(extractor.extract(URL).getError()).isEqualTo("connection refused");
  }

  @Test
  void extractReportsHttpErrors() throws Exception {
    stub(404, "<html><body><p>" + text("gone") + "</p></body></html>");

    ArticleExtractor.ExtractionResult result = extractor.extract(URL);

    assertThat(result.getError()).isEqualTo("HTTP 404");
    assertThat(result.getText()).isNull();
    assertThat(result.getParagraphs()).isZero();
  }

  @Test
  void extractSendsBrowserUserAgent() throws Exception {
    stub(200, "<html><body><p>" + text("body") + "</p></body></html>");

    extractor.extract(URL);

    ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
    verify(httpClient).send(request.capture(), any(HttpResponse.BodyHandler.class));
    assertThat(request.getValue().method()).isEqualTo("GET");
    assertThat(request.getValue().headers().firstValue("User-Agent")).contains("Mozilla/5.0 RssReader/2.0");
    assertThat(request.getValue().headers().firstValue("Accept")).contains("text/html,application/xhtml+xml");
  }

  @Test
  void extractKeepsArticleParagraphsAndDropsBoilerplate() throws Exception {
    String paragraphOne = text("first");
    String paragraphTwo = text("second");
    stub(200, """
        <html><head><title>Post title</title>
        <script>var tracking = "%s";</script>
        </head><body>
        <nav><p>%s</p></nav>
        <article>
          <h1>Short heading</h1>
          <p>%s</p>
          <p>%s</p>
        </article>
        <footer><p>%s</p></footer>
        </body></html>
        """.formatted(text("script"), text("navigation"), paragraphOne, paragraphTwo, text("footer")));

    ArticleExtractor.ExtractionResult result = extractor.extract(URL);

    assertThat(result.getError()).isNull();
    assertThat(result.getTitle()).isEqualTo("Post title");
    assertThat(result.getParagraphs()).isEqualTo(2);
    assertThat(result.isTruncated()).isFalse();
    assertThat(result.getText()).isEqualTo(paragraphOne + "\n\n" + paragraphTwo);
  }

  @Test
  void extractPrefersArticleOverBody() throws Exception {
    String inside = text("inside");
    String outside = text("outside");
    stub(200, """
        <html><body>
        <article><p>%s</p></article>
        <div><p>%s</p></div>
        </body></html>
        """.formatted(inside, outside));

    ArticleExtractor.ExtractionResult result = extractor.extract(URL);

    assertThat(result.getParagraphs()).isEqualTo(1);
    assertThat(result.getText()).isEqualTo(inside);
  }

  @Test
  void extractIgnoresParagraphsBelowMinimumLength() throws Exception {
    stub(200, "<html><body><article><h1>Heading</h1><p>too short</p></article></body></html>");

    ArticleExtractor.ExtractionResult result = extractor.extract(URL);

    assertThat(result.getParagraphs()).isZero();
    assertThat(result.getText()).isEmpty();
    assertThat(result.isTruncated()).isFalse();
  }

  @Test
  void extractTruncatesAtParagraphCap() throws Exception {
    StringBuilder html = new StringBuilder("<html><body><article>");
    for (int i = 0; i < 61; i++) {
      html.append("<p>").append(text("paragraph-" + i)).append("</p>");
    }
    stub(200, html.append("</article></body></html>").toString());

    ArticleExtractor.ExtractionResult result = extractor.extract(URL);

    assertThat(result.getParagraphs()).isEqualTo(60);
    assertThat(result.isTruncated()).isTrue();
  }

  @Test
  void extractTruncatesAtCharacterCap() throws Exception {
    stub(200, "<html><body><article><p>" + "x".repeat(20_000) + "</p></article></body></html>");

    ArticleExtractor.ExtractionResult result = extractor.extract(URL);

    assertThat(result.getParagraphs()).isEqualTo(1);
    assertThat(result.isTruncated()).isTrue();
    assertThat(result.getText()).hasSize(16_000);
  }

  @Test
  void extractReturnsErrorForMalformedUrl() {
    assertThat(extractor.extract("not a url").getError()).isNotBlank();

    verifyNoInteractions(httpClient);
  }

  private void stub(int status, String body) throws Exception {
    @SuppressWarnings("unchecked")
    HttpResponse<String> response = org.mockito.Mockito.mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(status);
    lenient().when(response.body()).thenReturn(body);
    when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
  }

  private String text(String marker) {
    return "This is the " + marker + " paragraph of the extracted article body.";
  }
}
