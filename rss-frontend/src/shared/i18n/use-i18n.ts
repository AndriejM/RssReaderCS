import {useCallback, useSyncExternalStore} from "react";
import {getLanguage, subscribeI18n, translateFor} from "@/shared/i18n/i18n.ts";

export function useI18n() {
  const language = useSyncExternalStore(subscribeI18n, getLanguage, getLanguage);
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translateFor(language, key, params),
    [language],
  );
  return {language, t};
}
