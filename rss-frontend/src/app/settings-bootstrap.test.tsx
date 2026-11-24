import { Suspense } from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsBootstrap } from "@/app/settings-bootstrap.tsx";
import { useAppConfigStore } from "@/shared/storage/app-config-store.ts";
import { useSettingsStore } from "@/shared/storage/settings-store.ts";
import { userConfigStore } from "@/shared/storage/user-config-store.ts";

const { appConfig, settings } = vi.hoisted(() => ({
  appConfig: {
    id: 1,
    appConfigPayload: {
      defaultUserId: 1,
      daysForSetRead: 3,
      daysForCleanRssItems: 7,
      isSetClickedRssToRead: false,
    },
  },
  settings: {
    language: "en",
    layout: "three",
    readTtlDays: 7,
    firstFeedDone: true,
    fontScales: { feeds: 100, headlines: 100, content: 100 },
    columnWidths: { feeds: 220, headlines: 420 },
    rowHeights: { headlines: 72 },
  },
}));

vi.mock("@/shared/api/api.ts", () => ({
  getAppConfig: vi.fn(async () => appConfig),
  saveAppConfig: vi.fn(),
  setCurrentUser: vi.fn(),
  getUserSettingsById: vi.fn(() => async () => settings),
  saveUserSettingsById: vi.fn(),
  getUserConfigById: vi.fn(() => async () => null),
  saveUserConfig: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useAppConfigStore.getState().appConfig.setValue(appConfig);
  useSettingsStore.setState({ userId: null });
  useSettingsStore.getState().getUserSettings.setValue(settings);
  userConfigStore.setState({ userId: null });
});

describe("settings bootstrap", () => {
  it("hydrates the user config store with the default user id", async () => {
    render(
      <Suspense fallback={null}>
        <SettingsBootstrap />
      </Suspense>,
    );

    await waitFor(() => expect(userConfigStore.getState().userId).toBe(1));
  });
});
