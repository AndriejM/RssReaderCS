import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedsSettings } from "@/features/settings/feeds-settings.tsx";
import * as api from "@/shared/api/api.ts";
import { useAppConfigStore } from "@/shared/storage/app-config-store.ts";
import { userConfigStore } from "@/shared/storage/user-config-store.ts";
import { useRssListAllStore } from "@/shared/storage/rss-list-all-store.ts";
import useConfirmationStore from "@/shared/storage/confirmation-store.ts";

const { toastMock, appConfig, userConfig } = vi.hoisted(() => ({
  toastMock: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
  appConfig: {
    id: 1,
    appConfigPayload: {
      defaultUserId: 1,
      daysForSetRead: 3,
      daysForCleanRssItems: 7,
      isSetClickedRssToRead: false,
    },
  },
  userConfig: {
    id: 1,
    userName: "user",
    userConfigPayload: {
      defaultCronExpression: "",
      groups: [
        {
          uuid: "g1",
          name: "News",
          rssConfigs: [
            { uuid: "f1", name: "Feed One", url: "https://a.example/feed", refreshCronExpression: "" },
          ],
        },
      ],
    },
  },
}));

vi.mock("@/shared/api/api.ts", () => {
  const fn = () => vi.fn(async () => undefined);
  return {
    exportFeeds: vi.fn(),
    importFeeds: vi.fn(),
    forgetReadMarkers: vi.fn(),
    getAppConfig: vi.fn(async () => appConfig),
    saveAppConfig: vi.fn(),
    setCurrentUser: vi.fn(),
    getUserConfigById: vi.fn(() => async () => userConfig),
    saveUserConfig: vi.fn(),
    getRssListByUser: vi.fn(fn()),
    setStatusRssRead: vi.fn(),
    getRssById: vi.fn(),
    getUserSettingsById: vi.fn(fn()),
    saveUserSettingsById: vi.fn(),
    createUser: vi.fn(),
    getUser: vi.fn(fn()),
    refreshFeed: vi.fn(),
  };
});

vi.mock("sonner", () => ({ toast: toastMock }));

beforeEach(() => {
  vi.clearAllMocks();
  useAppConfigStore.getState().appConfig.setValue(appConfig);
  userConfigStore.getState().getUserConfig.setValue(userConfig);
  userConfigStore.getState().getUserConfig.markStale = vi.fn();
  useRssListAllStore.getState().getRssList.markStale = vi.fn();
  useConfirmationStore.setState({ open: false, onAction: () => {} });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("feeds settings", () => {
  it("shows the configured feed count", async () => {
    render(<FeedsSettings />);

    expect(await screen.findByText(/Feeds configured: 1/)).toBeInTheDocument();
  });

  it("exports feeds as a JSON download", async () => {
    vi.mocked(api.exportFeeds).mockResolvedValue({ version: 1, feeds: [] });
    const createObjectURL = vi.fn(() => "blob:feeds");
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<FeedsSettings />);
    fireEvent.click(await screen.findByRole("button", { name: "Export" }));

    await waitFor(() => expect(api.exportFeeds).toHaveBeenCalledWith(1));
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:feeds");
    expect(toastMock.success).toHaveBeenCalledWith("Feeds exported.");
  });

  it("imports feeds from a JSON file", async () => {
    vi.mocked(api.importFeeds).mockResolvedValue({ ok: true, added: 2, skipped: 1, total: 3 });

    render(<FeedsSettings />);
    const input = (await screen.findByTestId("feeds-settings"))
      .querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(
      [JSON.stringify({ version: 1, feeds: [{ name: "A", url: "https://a.example/feed" }] })],
      "feeds.json",
      { type: "application/json" },
    );
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(api.importFeeds).toHaveBeenCalledWith(1, {
      version: 1,
      feeds: [{ name: "A", url: "https://a.example/feed" }],
    }));
    expect(toastMock.success).toHaveBeenCalledWith("Imported 2, skipped 1.");
  });

  it("reports an invalid import file", async () => {
    render(<FeedsSettings />);
    const input = (await screen.findByTestId("feeds-settings"))
      .querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [new File(["not json"], "bad.json", { type: "application/json" })] } });

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Could not import feeds."));
    expect(api.importFeeds).not.toHaveBeenCalled();
  });

  it("forgets read markers after confirmation", async () => {
    vi.mocked(api.forgetReadMarkers).mockResolvedValue("ok");

    render(<FeedsSettings />);
    fireEvent.click(await screen.findByRole("button", { name: "Forget read" }));

    const state = useConfirmationStore.getState();
    expect(state.open).toBe(true);
    expect(state.title).toBe("Forget read markers?");

    await state.onAction();

    await waitFor(() => expect(api.forgetReadMarkers).toHaveBeenCalledWith(1));
    expect(toastMock.success).toHaveBeenCalledWith("Read markers forgotten.");
  });

  it("reports an import rejected by the server", async () => {
    vi.mocked(api.importFeeds).mockResolvedValue({ ok: false, added: 0, skipped: 0, total: 0, error: "Server rejected the file." });

    render(<FeedsSettings />);
    const input = (await screen.findByTestId("feeds-settings"))
      .querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(
      [JSON.stringify({ version: 1, feeds: [{ name: "A", url: "https://a.example/feed" }] })],
      "feeds.json",
      { type: "application/json" },
    );
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Server rejected the file."));
  });
});
