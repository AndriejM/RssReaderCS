import {useEffect} from "react";
import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import {useSettingsStore, useSettingsStoreAsync} from "@/shared/storage/settings-store.ts";
import {setLanguage, type Language} from "@/shared/i18n/i18n.ts";

export function SettingsBootstrap() {
  const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
  const settings = useSettingsStoreAsync((state) => state.getUserSettings);
  const updateUserId = useSettingsStore((state) => state.updateUserId);

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
    setLanguage(settings.language as Language);
  }, [settings]);

  return null;
}
