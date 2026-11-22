import {type Effect, effect, hook, type Query, query} from "leo-query";
import {create} from "zustand";
import type {UserConfig} from "@/shared/model/types.ts";
import {
  getUserConfigById,
  saveUserConfig
} from "@/shared/api/api.ts";

export interface UserConfigStore {
  getUserConfig: Query<UserConfigStore, UserConfig | null>;
  saveUserConfig: Effect<UserConfigStore, [UserConfig]>;
  userId: number | null;
  updateUserId: (userId: number) => void;
}

export const userConfigStore = create<UserConfigStore>((set, get) => ({
  getUserConfig: query(getUserConfigById(get), (s) => [s.saveUserConfig, s.userId]), //invalidate todos when createTodo succeeds
  saveUserConfig: effect(saveUserConfig),
  userId: null,
  updateUserId: (userId: number) => set(() => ({ userId: userId }))
}));

export const userConfigStoreAsync = hook(userConfigStore);