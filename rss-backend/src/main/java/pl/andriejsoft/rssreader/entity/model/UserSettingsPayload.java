package pl.andriejsoft.rssreader.entity.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSettingsPayload {

  @Builder.Default
  private String language = "ru";

  @Builder.Default
  private String layout = "three";

  @Builder.Default
  private Integer readTtlDays = 7;

  @Builder.Default
  private Boolean firstFeedDone = false;

  @Builder.Default
  private Boolean sound = false;

  private String soundFile;

  @Builder.Default
  private Integer soundVolume = 50;

  @Builder.Default
  private Boolean showMessage = true;

  @Builder.Default
  private FontScales fontScales = new FontScales();

  @Builder.Default
  private ColumnWidths columnWidths = new ColumnWidths();

  @Builder.Default
  private RowHeights rowHeights = new RowHeights();

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class FontScales {

    @Builder.Default
    private Integer feeds = 100;

    @Builder.Default
    private Integer headlines = 100;

    @Builder.Default
    private Integer content = 100;
  }

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ColumnWidths {

    @Builder.Default
    private Integer feeds = 220;

    @Builder.Default
    private Integer headlines = 420;
  }

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class RowHeights {

    @Builder.Default
    private Integer headlines = 72;

    @Builder.Default
    private Integer content = 320;
  }
}
