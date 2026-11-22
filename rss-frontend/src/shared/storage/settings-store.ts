import {type Effect, effect, hook, type Query, query} from "leo-query";
import {create} from "zustand";
import type {UserSettingsPayload} from "@/shared/model/types.ts";
import {getUserSettingsById, saveUserSettingsById} from "@/shared/api/api.ts";

export interface SettingsStore {
  getUserSettings: Query<SettingsStore, UserSettingsPayload | null>;
  saveUserSettings: Effect<SettingsStore, [UserSettingsPayload]>;
  userId: number | null;
  updateUserId: (userId: number) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  getUserSettings: query(getUserSettingsById(get), (s) => [s.saveUserSettings, s.userId]),
  saveUserSettings: effect(saveUserSettingsById(get)),
  userId: null,
  updateUserId: (userId: number) => set(() => ({userId: userId})),
}));

export const useSettingsStoreAsync = hook(useSettingsStore);
