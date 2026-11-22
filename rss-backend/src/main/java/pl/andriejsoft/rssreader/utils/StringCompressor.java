package pl.andriejsoft.rssreader.utils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

public class StringCompressor {

  public static String compressString(String srcTxt) throws IOException {
    ByteArrayOutputStream rstBao = new ByteArrayOutputStream();
    try (GZIPOutputStream zos = new GZIPOutputStream(rstBao)) {
      zos.write(srcTxt.getBytes(StandardCharsets.UTF_8));
    }
    return Base64.getEncoder().encodeToString(rstBao.toByteArray());
  }

  public static String uncompressString(String zippedBase64Str) throws IOException {
    byte[] bytes = Base64.getDecoder().decode(zippedBase64Str);
    StringBuilder result = new StringBuilder();
    try (GZIPInputStream zi = new GZIPInputStream(new ByteArrayInputStream(bytes))) {
      byte[] buffer = new byte[8192];
      int read;
      while ((read = zi.read(buffer)) != -1) {
        result.append(new String(buffer, 0, read, StandardCharsets.UTF_8));
      }
    }
    return result.toString();
  }
}
