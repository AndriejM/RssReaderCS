package pl.andriejsoft.rssreader.utils;

import com.apptasticsoftware.rssreader.filter.FeedFilter;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;

public class InvalidXmlCharacterFilter implements FeedFilter {

  @Override
  public InputStream filter(InputStream inputStream) {

    return new FilterInputStream(inputStream) {
      @Override
      public int read() throws IOException {
        int data = super.read();
        return (data != -1) ? convert(data) : data;
      }

      @Override
      public int read(byte[] b, int off, int len) throws IOException {
        int n = in.read(b, off, len);
        for (int i = 0; i < n; i++) {
          b[i] = (byte) convert(b[i]);
        }
        return n;
      }
    };
  }

  private int convert(int input) {
    if (input > 0 && input < 32) {
      return 32;
    } else {
      return input;
    }
  }
}
