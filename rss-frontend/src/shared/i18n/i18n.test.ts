import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  dictionaries,
  getLanguage,
  LANGUAGES,
  setLanguage,
  t,
  translateFor,
} from "@/shared/i18n/i18n.ts";
import { useI18n } from "@/shared/i18n/use-i18n.ts";

describe("i18n dictionaries", () => {
  it("every language has exactly the same keys as en", () => {
    const enKeys = Object.keys(dictionaries.en).sort();
    for (const language of LANGUAGES) {
      expect(Object.keys(dictionaries[language]).sort()).toEqual(enKeys);
    }
  });

  it("no dictionary has empty translations", () => {
    for (const language of LANGUAGES) {
      for (const [key, value] of Object.entries(dictionaries[language])) {
        expect(value, `${language}:${key}`).not.toBe("");
      }
    }
  });
});

describe("t / translateFor", () => {
  beforeEach(() => {
    setLanguage("en");
  });

  it("interpolates params", () => {
    expect(t("settings.feeds.imported", { added: 3, skipped: 1 })).toBe("Imported 3, skipped 1.");
    expect(translateFor("ru", "group.refreshed", { name: "K", added: 5 })).toBe("K: +5");
  });

  it("keeps unknown placeholders untouched", () => {
    expect(t("settings.feeds.imported", { added: 2 })).toBe("Imported 2, skipped {skipped}.");
  });

  it("falls back to en for a key missing in the target language", () => {
    dictionaries.en["zzz.only_en"] = "Only english";
    expect(translateFor("de", "zzz.only_en")).toBe("Only english");
    delete dictionaries.en["zzz.only_en"];
  });

  it("returns the key itself when it is unknown everywhere", () => {
    expect(t("does.not.exist")).toBe("does.not.exist");
  });
});

describe("language switching", () => {
  beforeEach(() => {
    setLanguage("en");
    localStorage.clear();
  });

  it("setLanguage switches translation, persists and sets html lang", () => {
    setLanguage("ru");
    expect(getLanguage()).toBe("ru");
    expect(t("common.cancel")).toBe("Отмена");
    expect(localStorage.getItem("rss-language")).toBe("ru");
    expect(document.documentElement.lang).toBe("ru");
  });

  it("ignores unknown languages", () => {
    setLanguage("xx" as never);
    expect(getLanguage()).toBe("en");
  });

  it("syncs from storage events (multi-tab)", () => {
    window.dispatchEvent(new StorageEvent("storage", { key: "rss-language", newValue: "de" }));
    expect(getLanguage()).toBe("de");
    expect(t("common.cancel")).toBe("Abbrechen");

    window.dispatchEvent(new StorageEvent("storage", { key: "other-key", newValue: "ru" }));
    expect(getLanguage()).toBe("de");
  });

  it("useI18n re-renders on language change", () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.t("common.cancel")).toBe("Cancel");

    act(() => setLanguage("pl"));
    expect(result.current.language).toBe("pl");
    expect(result.current.t("common.cancel")).toBe("Anuluj");

    act(() => setLanguage("en"));
  });
});
