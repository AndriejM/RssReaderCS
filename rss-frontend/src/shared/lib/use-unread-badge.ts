import {useCallback, useEffect, useRef} from "react";
import {getRssUnreadCount} from "@/shared/api/api.ts";

const POLL_INTERVAL_MS = 60_000;

function applyTitle(unread: number) {
  document.title = unread > 99 ? "(99+) RssReader" : unread > 0 ? `(${unread}) RssReader` : "RssReader";
}

export function useUnreadBadge(userId: number | null) {
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const {unread} = await getRssUnreadCount(() => ({userId}))();
      if (activeRef.current) {
        applyTitle(unread);
      }
    } catch {
      // ignore polling errors
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      applyTitle(0);
      return;
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [userId, refresh]);

  return refresh;
}
