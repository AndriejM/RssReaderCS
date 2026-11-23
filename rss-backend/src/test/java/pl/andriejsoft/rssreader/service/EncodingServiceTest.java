package pl.andriejsoft.rssreader.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class EncodingServiceTest {

  private final EncodingService service = new EncodingService();

  @Test
  void decodeReturnsEmptyStringForNullOrEmptyBytes() {
    assertThat(service.decode(null, null)).isEmpty();
    assertThat(service.decode(new byte[0], "application/xml")).isEmpty();
  }

  @Test
  void decodeStripsUtf8Bom() {
    byte[] body = concat(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF},
        "<rss>ok</rss>".getBytes(StandardCharsets.UTF_8));

    String decoded = service.decode(body, null);

    assertThat(decoded).isEqualTo("<rss>ok</rss>");
  }

  @Test
  void decodePrefersCharsetFromContentType() {
    byte[] body = "Zażół gęś".getBytes(Charset.forName("windows-1250"));

    String decoded = service.decode(body, "application/rss+xml; charset=windows-1250");

    assertThat(decoded).isEqualTo("Zażół gęś");
  }

  @Test
  void decodeFallsBackToXmlDeclaration() {
    byte[] body = "<?xml version=\"1.0\" encoding=\"windows-1251\"?><rss>Привет</rss>"
        .getBytes(Charset.forName("windows-1251"));

    String decoded = service.decode(body, null);

    assertThat(decoded).contains("Привет");
  }

  @Test
  void decodeRewritesXmlDeclarationToUtf8() {
    byte[] body = "<?xml version=\"1.0\" encoding=\"windows-1251\"?><rss>Привет</rss>"
        .getBytes(Charset.forName("windows-1251"));

    String decoded = service.decode(body, null);

    assertThat(decoded).contains("encoding=\"UTF-8\"");
    assertThat(decoded).doesNotContain("windows-1251");
  }

  @Test
  void decodeFallsBackToWindows1251ForInvalidUtf8() {
    byte[] body = "Привет".getBytes(Charset.forName("windows-1251"));

    String decoded = service.decode(body, null);

    assertThat(decoded).isEqualTo("Привет");
  }

  @Test
  void decodeKeepsValidUtf8() {
    byte[] body = "Żółw i gęś".getBytes(StandardCharsets.UTF_8);

    assertThat(service.decode(body, null)).isEqualTo("Żółw i gęś");
  }

  @Test
  void decodeIgnoresUnknownCharsetNames() {
    byte[] body = "<rss>plain</rss>".getBytes(StandardCharsets.UTF_8);

    assertThat(service.decode(body, "application/xml; charset=not-a-real-charset"))
        .isEqualTo("<rss>plain</rss>");
  }

  private static byte[] concat(byte[] first, byte[] second) {
    byte[] result = new byte[first.length + second.length];
    System.arraycopy(first, 0, result, 0, first.length);
    System.arraycopy(second, 0, result, first.length, second.length);
    return result;
  }
}
