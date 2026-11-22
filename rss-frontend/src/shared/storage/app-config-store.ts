import {type Effect, effect, hook, type Query, query} from "leo-query";
import {create} from "zustand";
import type {AppConfig} from "@/shared/model/types.ts";
import {getAppConfig, saveAppConfig, setCurrentUser} from "@/shared/api/api.ts";

export interface AppConfigStore {
  appConfig: Query<AppConfigStore, AppConfig>;
  saveAppConfig: Effect<AppConfigStore, [AppConfig]>;
  setCurrentUser: Effect<AppConfigStore, [number]>;
}

export const useAppConfigStore = create<AppConfigStore>(() => ({
  appConfig: query(getAppConfig, (s) => [s.saveAppConfig, s.setCurrentUser]), //invalidate todos when createTodo succeeds
  saveAppConfig: effect(saveAppConfig),
  setCurrentUser: effect(setCurrentUser),
}));

export const useAppConfigStoreAsync = hook(useAppConfigStore);