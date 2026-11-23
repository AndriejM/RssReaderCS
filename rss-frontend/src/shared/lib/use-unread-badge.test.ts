import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRssUnreadCount } from "@/shared/api/api.ts";
import { useUnreadBadge } from "@/shared/lib/use-unread-badge.ts";

vi.mock("@/shared/api/api.ts", () => ({
  getRssUnreadCount: vi.fn(),
}));

const getRssUnreadCountMock = vi.mocked(getRssUnreadCount);

function unreadResponse(unread: number) {
  return vi.fn(async () => ({ unread }));
}

beforeEach(() => {
  vi.useFakeTimers();
  getRssUnreadCountMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

async function flush() {
  await vi.advanceTimersByTimeAsync(0);
}

describe("useUnreadBadge", () => {
  it("polls on mount and reflects the count in document.title", async () => {
    getRssUnreadCountMock.mockReturnValue(unreadResponse(7));

    renderHook(() => useUnreadBadge(1));
    await flush();

    expect(getRssUnreadCountMock).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("(7) RssReader");
  });

  it("repeats polling every 60s", async () => {
    getRssUnreadCountMock.mockReturnValue(unreadResponse(1));

    renderHook(() => useUnreadBadge(1));
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    await flush();

    expect(getRssUnreadCountMock).toHaveBeenCalledTimes(2);
  });

  it("caps the badge at 99+", async () => {
    getRssUnreadCountMock.mockReturnValue(unreadResponse(150));

    renderHook(() => useUnreadBadge(1));
    await flush();

    expect(document.title).toBe("(99+) RssReader");
  });

  it("clears the title when there is nothing unread", async () => {
    getRssUnreadCountMock.mockReturnValue(unreadResponse(0));

    renderHook(() => useUnreadBadge(1));
    await flush();

    expect(document.title).toBe("RssReader");
  });

  it("does not poll without a user and resets the title", async () => {
    document.title = "(5) RssReader";

    renderHook(() => useUnreadBadge(null));
    await flush();

    expect(getRssUnreadCountMock).not.toHaveBeenCalled();
    expect(document.title).toBe("RssReader");
  });

  it("ignores polling errors", async () => {
    getRssUnreadCountMock.mockReturnValue(vi.fn(async () => {
      throw new Error("network down");
    }));

    renderHook(() => useUnreadBadge(1));
    await flush();

    expect(getRssUnreadCountMock).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("RssReader");
  });

  it("stops polling after unmount", async () => {
    getRssUnreadCountMock.mockReturnValue(unreadResponse(2));

    const { unmount } = renderHook(() => useUnreadBadge(1));
    await flush();
    unmount();
    await vi.advanceTimersByTimeAsync(120_000);
    await flush();

    expect(getRssUnreadCountMock).toHaveBeenCalledTimes(1);
  });
});
