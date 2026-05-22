package pl.andriejsoft.rssreader.exception;

public class RssReaderException extends RuntimeException {

  public RssReaderException(String message) {
    super(message);
  }

  public RssReaderException(String message, Throwable cause) {
    super(message, cause);
  }
}
