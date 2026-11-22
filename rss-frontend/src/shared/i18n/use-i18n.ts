import {useSyncExternalStore} from "react";
import {getLanguage, subscribeI18n, t as translate} from "@/shared/i18n/i18n.ts";

export function useI18n() {
  const language = useSyncExternalStore(subscribeI18n, getLanguage, getLanguage);
  return {language, t: translate};
}
