package pl.andriejsoft.rssreader.service;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class EncodingService {

  private static final Pattern CONTENT_TYPE_CHARSET = Pattern.compile(
      "charset\\s*=\\s*[\"']?([^\"';\\s]+)", Pattern.CASE_INSENSITIVE);
  private static final Pattern XML_ENCODING = Pattern.compile(
      "<\\?xml[^>]*encoding\\s*=\\s*[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);
  private static final Pattern XML_DECLARATION = Pattern.compile(
      "<\\?xml[^>]*encoding\\s*=\\s*[\"'][^\"']+[\"']", Pattern.CASE_INSENSITIVE);

  public String decode(byte[] bytes, String contentType) {
    if (bytes == null || bytes.length == 0) {
      return "";
    }
    BomResult bom = stripBom(bytes);
    Charset charset = detectCharset(bom.bytes(), contentType, bom.charset());
    String text = new String(bom.bytes(), charset);
    return normalizeXmlEncoding(text);
  }

  private BomResult stripBom(byte[] bytes) {
    if (bytes.length >= 3
        && (bytes[0] & 0xff) == 0xEF
        && (bytes[1] & 0xff) == 0xBB
        && (bytes[2] & 0xff) == 0xBF) {
      return new BomResult(java.util.Arrays.copyOfRange(bytes, 3, bytes.length), StandardCharsets.UTF_8);
    }
    if (bytes.length >= 2 && (bytes[0] & 0xff) == 0xFF && (bytes[1] & 0xff) == 0xFE) {
      return new BomResult(java.util.Arrays.copyOfRange(bytes, 2, bytes.length), StandardCharsets.UTF_16LE);
    }
    if (bytes.length >= 2 && (bytes[0] & 0xff) == 0xFE && (bytes[1] & 0xff) == 0xFF) {
      return new BomResult(java.util.Arrays.copyOfRange(bytes, 2, bytes.length), StandardCharsets.UTF_16BE);
    }
    return new BomResult(bytes, null);
  }

  private Charset detectCharset(byte[] bytes, String contentType, Charset bomCharset) {
    if (bomCharset != null) {
      return bomCharset;
    }
    Charset fromContentType = charsetFromContentType(contentType);
    if (fromContentType != null) {
      return fromContentType;
    }
    Charset fromXml = charsetFromXmlDeclaration(bytes);
    if (fromXml != null) {
      return fromXml;
    }
    if (isValidUtf8(bytes)) {
      return StandardCharsets.UTF_8;
    }
    return Charset.forName("windows-1251");
  }

  private Charset charsetFromContentType(String contentType) {
    if (!StringUtils.hasText(contentType)) {
      return null;
    }
    Matcher matcher = CONTENT_TYPE_CHARSET.matcher(contentType);
    return matcher.find() ? toCharset(matcher.group(1)) : null;
  }

  private Charset charsetFromXmlDeclaration(byte[] bytes) {
    String head = new String(bytes, 0, Math.min(bytes.length, 512), StandardCharsets.ISO_8859_1);
    Matcher matcher = XML_ENCODING.matcher(head);
    return matcher.find() ? toCharset(matcher.group(1)) : null;
  }

  private Charset toCharset(String name) {
    try {
      return Charset.forName(name.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      return null;
    }
  }

  private boolean isValidUtf8(byte[] bytes) {
    CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder()
        .onMalformedInput(CodingErrorAction.REPORT)
        .onUnmappableCharacter(CodingErrorAction.REPORT);
    try {
      decoder.decode(ByteBuffer.wrap(bytes));
      return true;
    } catch (CharacterCodingException e) {
      return false;
    }
  }

  private String normalizeXmlEncoding(String text) {
    if (!StringUtils.hasText(text)) {
      return text;
    }
    String normalized = text.replace("\uFEFF", "");
    Matcher matcher = XML_DECLARATION.matcher(normalized);
    if (matcher.find()) {
      String declaration = matcher.group();
      String replacement = declaration.replaceAll("encoding\\s*=\\s*[\"'][^\"']+[\"']",
          "encoding=\"UTF-8\"");
      normalized = matcher.replaceFirst(Matcher.quoteReplacement(replacement));
    }
    return normalized;
  }

  private record BomResult(byte[] bytes, Charset charset) {

  }
}
