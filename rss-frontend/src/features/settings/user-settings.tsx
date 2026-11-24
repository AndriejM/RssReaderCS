import {useEffect, useMemo, useState} from "react";
import {toast} from "sonner";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Input} from "@/shared/ui/kit/input.tsx";
import {Label} from "@/shared/ui/kit/label.tsx";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/shared/ui/kit/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/kit/select.tsx";
import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import {useSettingsStore, useSettingsStoreAsync} from "@/shared/storage/settings-store.ts";
import {useTheme, type Theme} from "@/shared/ui/components/theme/theme-context.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";
import {LANGUAGES, setLanguage, type Language} from "@/shared/i18n/i18n.ts";
import {LAYOUTS} from "@/shared/model/layout.ts";
import type {UserSettingsPayload} from "@/shared/model/types.ts";

const THEMES = ["light", "dark", "system"] as const;

function clampInt(value: string, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(Math.round(parsed), min), max);
}

export function UserSettings() {
  const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
  const settings = useSettingsStoreAsync((state) => state.getUserSettings);
  const updateUserId = useSettingsStore((state) => state.updateUserId);
  const saveSettings = useSettingsStore((state) => state.saveUserSettings.trigger);
  const {theme, setTheme} = useTheme();
  const {t} = useI18n();

  const [draft, setDraft] = useState<UserSettingsPayload | null>(settings);
  const [base, setBase] = useState<UserSettingsPayload | null>(settings);
  const [saving, setSaving] = useState(false);

  const defaultUserId = appConfig?.appConfigPayload?.defaultUserId;

  useEffect(() => {
    if (defaultUserId !== undefined) {
      updateUserId(defaultUserId);
    }
  }, [defaultUserId, updateUserId]);

  if (settings !== base) {
    setBase(settings);
    setDraft(settings);
  }

  useEffect(() => {
    if (settings) {
      setLanguage(settings.language as Language);
    }
  }, [settings]);

  const dirty = useMemo(
      () => !!draft && JSON.stringify(draft) !== JSON.stringify(settings),
      [draft, settings]
  );

  function patch(next: Partial<UserSettingsPayload>) {
    setDraft((current) => (current ? {...current, ...next} : current));
  }

  async function writeHandler() {
    if (!draft) {
      return;
    }
    setSaving(true);
    try {
      await saveSettings(draft);
      setLanguage(draft.language as Language);
      useSettingsStore.getState().getUserSettings.markStale();
      toast.success(t("settings.saved"));
    } catch {
      toast.error(t("settings.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return null;
  }

  return (
      <div className="flex justify-center pt-5">
        <Card className="w-3/4">
          <CardHeader>
            <CardTitle>{t("settings.user.title")}</CardTitle>
            <CardAction>
              <div className="flex items-center gap-3">
                {dirty && <span className="text-xs text-destructive">{t("settings.unsaved")}</span>}
                <Button onClick={() => void writeHandler()} disabled={saving || !dirty}>
                  {t("settings.write")}
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("settings.theme")}</Label>
                <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
                  <SelectTrigger>
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map((themeOption) => (
                        <SelectItem key={themeOption} value={themeOption}>{t(`theme.${themeOption}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("settings.language")}</Label>
                <Select value={draft.language} onValueChange={(value) => patch({language: value})}>
                  <SelectTrigger>
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((language) => (
                        <SelectItem key={language} value={language}>{language.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("settings.layout")}</Label>
                <Select value={draft.layout} onValueChange={(value) => patch({layout: value})}>
                  <SelectTrigger>
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUTS.map((layout) => (
                        <SelectItem key={layout} value={layout}>{t(`layout.${layout}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="readTtl">{t("settings.readTtl")}</Label>
                <Input
                    id="readTtl"
                    type="number"
                    min={1}
                    max={3650}
                    value={draft.readTtlDays}
                    onChange={(event) => patch({readTtlDays: clampInt(event.target.value, 1, 3650, 7)})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rowHeadlines">{t("settings.row.headlines")}</Label>
                <Input
                    id="rowHeadlines"
                    type="number"
                    min={40}
                    max={240}
                    value={draft.rowHeights.headlines}
                    onChange={(event) => patch({
                      rowHeights: {...draft.rowHeights, headlines: clampInt(event.target.value, 40, 240, 72)},
                    })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rowContent">{t("settings.row.content")}</Label>
                <Input
                    id="rowContent"
                    type="number"
                    min={120}
                    max={1200}
                    value={draft.rowHeights.content}
                    onChange={(event) => patch({
                      rowHeights: {...draft.rowHeights, content: clampInt(event.target.value, 120, 1200, 320)},
                    })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontFeeds">{t("settings.font.feeds")}</Label>
                <Input
                    id="fontFeeds"
                    type="number"
                    min={50}
                    max={200}
                    value={draft.fontScales.feeds}
                    onChange={(event) => patch({
                      fontScales: {...draft.fontScales, feeds: clampInt(event.target.value, 50, 200, 100)},
                    })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontHeadlines">{t("settings.font.headlines")}</Label>
                <Input
                    id="fontHeadlines"
                    type="number"
                    min={50}
                    max={200}
                    value={draft.fontScales.headlines}
                    onChange={(event) => patch({
                      fontScales: {...draft.fontScales, headlines: clampInt(event.target.value, 50, 200, 100)},
                    })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontContent">{t("settings.font.content")}</Label>
                <Input
                    id="fontContent"
                    type="number"
                    min={50}
                    max={200}
                    value={draft.fontScales.content}
                    onChange={(event) => patch({
                      fontScales: {...draft.fontScales, content: clampInt(event.target.value, 50, 200, 100)},
                    })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
