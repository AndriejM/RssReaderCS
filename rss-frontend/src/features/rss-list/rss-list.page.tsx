import {useCallback, useEffect, useMemo, useState} from "react";
import {toast} from "sonner";
import {useRssListAllStore, useRssListAllStoreAsync} from "@/shared/storage/rss-list-all-store.ts";
import {useRssContentStore} from "@/shared/storage/rss-content-store.ts";
import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Input} from "@/shared/ui/kit/input.tsx";
import {RssContent} from "@/features/rss-list/rss-content.tsx";
import {cn} from "@/shared/lib/css";
import {
    deleteRssItem,
    getRssFullText,
    markRssRead,
    markRssUnread,
    refreshAllFeeds,
    restoreRssItem,
    setStatusRssRead,
} from "@/shared/api/api.ts";
import type {RssFullText, RssItem} from "@/shared/model/types.ts";

function formatDate(value?: string) {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function matchesSearch(item: RssItem, query: string) {
    return [
        item.title,
        item.link,
        item.feedName,
        item.description,
        item.itemPayload?.description,
    ].some((value) => value?.toLowerCase().includes(query));
}

function RssListPage() {
    const rssList = useRssListAllStoreAsync((state) => state.getRssList);
    const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
    const updateUserId = useRssListAllStore((state) => state.updateUserId);

    const [rssId, setRssId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [refreshingAll, setRefreshingAll] = useState(false);
    const [fullText, setFullText] = useState<RssFullText | null>(null);
    const [fullTextLoading, setFullTextLoading] = useState(false);
    const [fullTextError, setFullTextError] = useState<string | null>(null);

    const userId = appConfig?.appConfigPayload?.defaultUserId ?? null;

    useEffect(() => {
        if (appConfig?.appConfigPayload) {
            updateUserId(appConfig.appConfigPayload.defaultUserId);
        }
    }, [appConfig, updateUserId]);

    const invalidate = useCallback(() => {
        useRssListAllStore.getState().getRssList.markStale();
        useRssContentStore.getState().rss.markStale();
    }, []);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return rssList;
        }
        return rssList.filter((item) => matchesSearch(item, query));
    }, [rssList, search]);

    const selected = useMemo(
        () => rssList.find((item) => item.id === rssId) ?? null,
        [rssList, rssId]
    );

    const unreadCount = useMemo(
        () => rssList.filter((item) => item.status !== 'READ').length,
        [rssList]
    );

    const select = useCallback(async (item: RssItem) => {
        setRssId(item.id);
        setFullText(null);
        setFullTextError(null);

        if (item.id !== null && item.status !== 'READ' && appConfig?.appConfigPayload?.isSetClickedRssToRead) {
            try {
                await setStatusRssRead(item.id);
                invalidate();
            } catch {
                toast.error("Could not mark item as read.");
            }
        }
    }, [appConfig, invalidate]);

    const move = useCallback((delta: number) => {
        if (filtered.length === 0) {
            return;
        }
        const currentIndex = filtered.findIndex((item) => item.id === rssId);
        const nextIndex = currentIndex < 0
            ? 0
            : Math.min(Math.max(currentIndex + delta, 0), filtered.length - 1);
        const nextItem = filtered[nextIndex];
        if (nextItem) {
            void select(nextItem);
        }
    }, [filtered, rssId, select]);

    const markRead = useCallback(async (item: RssItem) => {
        if (item.id === null) {
            return;
        }
        try {
            await markRssRead(item.id);
            invalidate();
        } catch {
            toast.error("Could not mark item as read.");
        }
    }, [invalidate]);

    const markUnread = useCallback(async (item: RssItem) => {
        if (item.id === null) {
            return;
        }
        try {
            await markRssUnread(item.id);
            invalidate();
        } catch {
            toast.error("Could not mark item as unread.");
        }
    }, [invalidate]);

    const deleteItem = useCallback(async (item: RssItem) => {
        const itemId = item.id;
        if (itemId === null) {
            return;
        }
        try {
            await deleteRssItem(itemId);
            if (rssId === itemId) {
                setRssId(null);
            }
            invalidate();
            toast("Item deleted", {
                action: {
                    label: "Undo",
                    onClick: async () => {
                        try {
                            await restoreRssItem(itemId);
                            invalidate();
                            setRssId(itemId);
                        } catch {
                            toast.error("Could not restore item.");
                        }
                    },
                },
            });
        } catch {
            toast.error("Could not delete item.");
        }
    }, [invalidate, rssId]);

    const loadFullText = useCallback(async (item: RssItem) => {
        if (item.id === null) {
            return;
        }
        setFullTextLoading(true);
        setFullTextError(null);
        try {
            const result = await getRssFullText(item.id);
            setFullText(result);
            if (result.error) {
                setFullTextError(result.error);
            }
        } catch {
            setFullText(null);
            setFullTextError("Could not load full text.");
        } finally {
            setFullTextLoading(false);
        }
    }, []);

    const refreshAll = useCallback(async () => {
        setRefreshingAll(true);
        try {
            const result = await refreshAllFeeds(() => ({userId}))();
            if (!result) {
                toast.warning("No user selected.");
                return;
            }
            const added = result.results.reduce((sum, feed) => sum + feed.added, 0);
            if (result.failed > 0) {
                toast.warning(`Refreshed feeds: ${added} new, ${result.failed} failed.`);
            } else {
                toast.success(`Refreshed feeds: ${added} new.`);
            }
            invalidate();
        } catch {
            toast.error("Could not refresh feeds.");
        } finally {
            setRefreshingAll(false);
        }
    }, [invalidate, userId]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }

            switch (event.key) {
                case 'j':
                    event.preventDefault();
                    move(1);
                    break;
                case 'k':
                    event.preventDefault();
                    move(-1);
                    break;
                case 'm':
                    event.preventDefault();
                    if (selected) {
                        void (selected.status === 'READ' ? markUnread(selected) : markRead(selected));
                    }
                    break;
                case 'f':
                    event.preventDefault();
                    if (selected) {
                        void loadFullText(selected);
                    }
                    break;
                case 'r':
                    event.preventDefault();
                    void refreshAll();
                    break;
                case 'Delete':
                    event.preventDefault();
                    if (selected) {
                        void deleteItem(selected);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [deleteItem, loadFullText, markRead, markUnread, move, refreshAll, selected]);

    return (
        <div className="flex h-screen">
            <aside className="flex w-[320px] flex-col border-r">
                <div className="flex gap-2 border-b p-2">
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search..."
                    />
                    <Button size="sm" onClick={() => void refreshAll()} disabled={refreshingAll}>
                        {refreshingAll ? "Refreshing" : "Refresh"}
                    </Button>
                </div>
                <div className="px-2 py-1 text-xs text-muted-foreground">
                    {filtered.length} shown / {unreadCount} unread
                </div>
                <div className="grow overflow-y-auto">
                    {filtered.map((item) => (
                        <button
                            key={item.id ?? item.link}
                            type="button"
                            onClick={() => void select(item)}
                            className={cn(
                                "block w-full border-b px-3 py-2 text-left hover:bg-accent",
                                item.status === 'READ' ? "text-muted-foreground" : "font-medium"
                            )}
                        >
                            <div className="line-clamp-2">{item.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                {item.feedName ?? "Unknown feed"} · {formatDate(item.pubDate)}
                            </div>
                        </button>
                    ))}
                </div>
            </aside>
            <main className="grow overflow-y-auto p-4">
                <RssContent
                    rssId={rssId}
                    item={selected}
                    fullText={fullText}
                    fullTextLoading={fullTextLoading}
                    fullTextError={fullTextError}
                    onFullText={loadFullText}
                    onMarkRead={markRead}
                    onMarkUnread={markUnread}
                    onDelete={deleteItem}
                />
            </main>
        </div>
    );
}

export const Component = RssListPage;
