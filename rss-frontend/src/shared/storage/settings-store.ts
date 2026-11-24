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

const SETTINGS_CHANNEL = "rss-reader:settings";
const SETTINGS_STORAGE_KEY = "rss-reader:settings";

let channel: BroadcastChannel | null = null;
try {
  channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(SETTINGS_CHANNEL) : null;
} catch {
  channel = null;
}

export function broadcastSettings(settings: UserSettingsPayload) {
  try {
    channel?.postMessage(settings);
  } catch {
    // cross-tab sync is best effort
  }
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // cross-tab sync is best effort
  }
}

function applyRemoteSettings(settings: UserSettingsPayload) {
  useSettingsStore.getState().getUserSettings.setValue(settings);
}

if (channel) {
  channel.onmessage = (event: MessageEvent<UserSettingsPayload>) => {
    if (event.data && typeof event.data === "object") {
      applyRemoteSettings(event.data);
    }
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === SETTINGS_STORAGE_KEY && event.newValue) {
      try {
        applyRemoteSettings(JSON.parse(event.newValue) as UserSettingsPayload);
      } catch {
        // ignore malformed payloads
      }
    }
  });
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  getUserSettings: query(getUserSettingsById(get), (s) => [s.saveUserSettings, s.userId]),
  saveUserSettings: effect(async (settings: UserSettingsPayload) => {
    await saveUserSettingsById(get)(settings);
    broadcastSettings(settings);
  }),
  userId: null,
  updateUserId: (userId: number) => set(() => ({userId: userId})),
}));

export const useSettingsStoreAsync = hook(useSettingsStore);
