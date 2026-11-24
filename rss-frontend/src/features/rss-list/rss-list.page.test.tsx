import { Suspense } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Component as RssListPage } from "@/features/rss-list/rss-list.page.tsx";
import * as api from "@/shared/api/api.ts";
import { useAppConfigStore } from "@/shared/storage/app-config-store.ts";
import { useRssListAllStore } from "@/shared/storage/rss-list-all-store.ts";
import { useSettingsStore } from "@/shared/storage/settings-store.ts";
import { userConfigStore } from "@/shared/storage/user-config-store.ts";
import type { AppConfig, RssItem, UserConfig } from "@/shared/model/types.ts";

const { toastMock, currentSettings, saveUserSettingsInner } = vi.hoisted(() => ({
  toastMock: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
  currentSettings: {
    theme: "system",
    language: "en",
    layout: "three",
    readTtlDays: 7,
    firstFeedDone: true,
    fontScales: { feeds: 100, headlines: 100, content: 100 },
    columnWidths: { feeds: 220, headlines: 420 },
    rowHeights: { headlines: 0 },
  },
  saveUserSettingsInner: vi.fn(async () => undefined),
}));

vi.mock("@/shared/api/api.ts", () => ({
    getRssListByUser: vi.fn(() => async () => [...items]),
    setStatusRssRead: vi.fn(),
    markRssRead: vi.fn(),
    markRssUnread: vi.fn(),
    deleteRssItem: vi.fn(),
    restoreRssItem: vi.fn(),
    getRssFullText: vi.fn(),
    refreshAllFeeds: vi.fn(() => async () => undefined),
    getRssById: vi.fn(),
    getRssUnreadCount: vi.fn(() => async () => ({ unread: items.length })),
    getAppConfig: vi.fn(async () => appConfig),
    saveAppConfig: vi.fn(),
    setCurrentUser: vi.fn(),
    getUserConfigById: vi.fn(() => async () => userConfig),
    saveUserConfig: vi.fn(),
    getUserSettingsById: vi.fn(() => async () => ({ ...currentSettings })),
    saveUserSettingsById: vi.fn(() => saveUserSettingsInner),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

function item(overrides: Partial<RssItem> = {}): RssItem {
  return {
    id: 1,
    userId: 1,
    groupUuid: "g1",
    rssUuid: "f1",
    status: "NEW",
    link: "https://a.example/1",
    title: "Alpha news",
    pubDate: "2026-11-01T10:00:00Z",
    feedName: "Feed One",
    itemPayload: { title: "Alpha news", link: "https://a.example/1", pubDate: "", description: "alpha body" },
    ...overrides,
  };
}

const items: RssItem[] = [
  item(),
  item({
    id: 2,
    rssUuid: "f2",
    link: "https://b.example/2",
    title: "Beta story",
    pubDate: "2026-11-02T10:00:00Z",
    feedName: "Feed Two",
    itemPayload: { title: "Beta story", link: "https://b.example/2", pubDate: "", description: "beta body" },
  }),
  item({
    id: 3,
    rssUuid: "f2",
    status: "READ",
    link: "https://b.example/3",
    title: "Gamma old",
    pubDate: "2026-10-20T10:00:00Z",
    feedName: "Feed Two",
    itemPayload: { title: "Gamma old", link: "https://b.example/3", pubDate: "", description: "gamma body" },
  }),
];

const appConfig: AppConfig = {
  id: 1,
  appConfigPayload: {
    defaultUserId: 1,
    daysForSetRead: 3,
    daysForCleanRssItems: 7,
    isSetClickedRssToRead: false,
  },
};

const userConfig: UserConfig = {
  id: 1,
  userName: "user",
  userConfigPayload: {
    defaultCronExpression: "0 0/30 * * * *",
    groups: [
      {
        uuid: "g1",
        name: "News",
        rssConfigs: [
          { uuid: "f1", name: "Feed One", url: "https://a.example/feed", refreshCronExpression: "" },
          { uuid: "f2", name: "Feed Two", url: "https://b.example/feed", refreshCronExpression: "" },
        ],
      },
    ],
  },
};

function renderPage() {
  render(
    <Suspense fallback={<div>loading-page</div>}>
      <RssListPage />
    </Suspense>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  useRssListAllStore.setState({ userId: 1 });
  useRssListAllStore.getState().getRssList.setValue(items);
  useAppConfigStore.getState().appConfig.setValue(appConfig);
  useSettingsStore.setState({ userId: 1 });
  currentSettings.layout = "three";
  useSettingsStore.getState().getUserSettings.setValue({ ...currentSettings });
  userConfigStore.getState().getUserConfig.setValue(userConfig);
  vi.mocked(api.getRssById).mockImplementation(async (id: number) => items.find((i) => i.id === id) ?? items[0]);
});

describe("reader page", () => {
  it("renders feeds with unread counters and headlines freshest first", async () => {
    renderPage();

    expect(await screen.findByText("All feeds")).toBeInTheDocument();
    expect(screen.getByText("Feed One")).toBeInTheDocument();
    expect(screen.getByText("Feed Two")).toBeInTheDocument();

    const headlines = screen.getByRole("listbox", { name: "Headlines" });
    const options = [...headlines.querySelectorAll('[role="option"]')];
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("Beta story"),
      expect.stringContaining("Alpha news"),
      expect.stringContaining("Gamma old"),
    ]);
  });

  it("selects a headline on click and shows it in the content panel", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Alpha news"));

    expect(await screen.findByRole("link", { name: "https://a.example/1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark read" })).toBeInTheDocument();
  });

  it("navigates headlines with arrow keys", async () => {
    renderPage();
    await screen.findByText("Beta story");

    fireEvent.keyDown(window, { key: "ArrowDown", code: "ArrowDown" });
    await waitFor(() => {
      expect(screen.getByText("Alpha news").closest('[role="option"]')).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(window, { key: "ArrowUp", code: "ArrowUp" });
    await waitFor(() => {
      expect(screen.getByText("Beta story").closest('[role="option"]')).toHaveAttribute("aria-selected", "true");
    });
  });

  it("marks the selected item read via the m key", async () => {
    renderPage();
    await screen.findByText("Beta story");

    fireEvent.keyDown(window, { key: "m", code: "KeyM" });

    await waitFor(() => expect(api.markRssRead).toHaveBeenCalledWith(2));
    expect(api.markRssUnread).not.toHaveBeenCalled();
  });

  it("marks a read item unread via the content button", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Gamma old"));

    const button = await screen.findByRole("button", { name: "Mark unread" });
    fireEvent.click(button);

    await waitFor(() => expect(api.markRssUnread).toHaveBeenCalledWith(3));
  });

  it("deletes the selected item via the d key and offers undo", async () => {
    renderPage();
    await screen.findByText("Beta story");

    fireEvent.keyDown(window, { key: "d", code: "KeyD" });

    await waitFor(() => expect(api.deleteRssItem).toHaveBeenCalledWith(2));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(
      "Item deleted",
      expect.objectContaining({ action: expect.objectContaining({ label: "Undo" }) }),
    ));

    const undoCall = toastMock.mock.calls.find((call) => call[1]?.action?.onClick);
    undoCall![1].action.onClick();
    await waitFor(() => expect(api.restoreRssItem).toHaveBeenCalledWith(2));
  });

  it("undoes the last delete via the u key", async () => {
    renderPage();
    await screen.findByText("Beta story");

    fireEvent.keyDown(window, { key: "d", code: "KeyD" });
    await waitFor(() => expect(api.deleteRssItem).toHaveBeenCalledWith(2));

    fireEvent.keyDown(window, { key: "u", code: "KeyU" });

    await waitFor(() => expect(api.restoreRssItem).toHaveBeenCalledWith(2));
  });

  it("filters headlines by search words", async () => {
    renderPage();
    await screen.findByText("Beta story");

    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "alpha" } });

    expect(await screen.findByText("Alpha news")).toBeInTheDocument();
    expect(screen.queryByText("Beta story")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma old")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "" } });

    expect(await screen.findByText("Beta story")).toBeInTheDocument();
    expect(screen.getByText("Gamma old")).toBeInTheDocument();
  });

  it("restores the selected feed and headline after remount", async () => {
    const first = render(
      <Suspense fallback={<div>loading-page</div>}>
        <RssListPage />
      </Suspense>,
    );

    fireEvent.click(await screen.findByText("Feed One"));
    await waitFor(() =>
      expect(screen.getByText("Alpha news").closest('[role="option"]')).toHaveAttribute("aria-selected", "true"),
    );

    first.unmount();
    renderPage();

    expect(await screen.findByText("Alpha news")).toBeInTheDocument();
    expect(screen.queryByText("Beta story")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Alpha news").closest('[role="option"]')).toHaveAttribute("aria-selected", "true"),
    );
  });

  it("switches layout and hides panels accordingly", async () => {
    renderPage();
    await screen.findByText("Beta story");

    currentSettings.layout = "list";
    fireEvent.click(screen.getByRole("button", { name: "list" }));

    await waitFor(() => expect(saveUserSettingsInner).toHaveBeenCalled());
    expect(await screen.findByTestId("reader-root")).toHaveAttribute("data-layout", "list");
    expect(screen.queryByRole("listbox", { name: "Feeds" })).not.toBeInTheDocument();
    expect(screen.queryByText("alpha body")).not.toBeInTheDocument();

    currentSettings.layout = "split";
    await new Promise((r) => setTimeout(r, 700));
    fireEvent.click(screen.getByRole("button", { name: "split" }));
    await waitFor(() => expect(saveUserSettingsInner).toHaveBeenCalledTimes(2));

    expect(await screen.findByTestId("reader-root")).toHaveAttribute("data-layout", "split");
    expect(screen.queryByRole("listbox", { name: "Feeds" })).not.toBeInTheDocument();
  });
});
