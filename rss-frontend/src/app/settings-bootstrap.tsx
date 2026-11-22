import {useEffect} from "react";
import {useTheme} from "@/shared/ui/components/theme/theme-context.ts";
import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import {useSettingsStore, useSettingsStoreAsync} from "@/shared/storage/settings-store.ts";
import {setLanguage, type Language} from "@/shared/i18n/i18n.ts";
import type {Theme} from "@/shared/ui/components/theme/theme-context.ts";

export function SettingsBootstrap() {
  const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
  const settings = useSettingsStoreAsync((state) => state.getUserSettings);
  const updateUserId = useSettingsStore((state) => state.updateUserId);
  const {setTheme} = useTheme();

  const defaultUserId = appConfig?.appConfigPayload?.defaultUserId;

  useEffect(() => {
    if (defaultUserId !== undefined) {
      updateUserId(defaultUserId);
    }
  }, [defaultUserId, updateUserId]);

  useEffect(() => {
    if (!settings) {
      return;
    }
    setTheme(settings.theme as Theme);
    setLanguage(settings.language as Language);
  }, [settings, setTheme]);

  return null;
}
