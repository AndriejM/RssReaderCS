import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {toast} from "sonner";
import {useRssListAllStore, useRssListAllStoreAsync} from "@/shared/storage/rss-list-all-store.ts";
import {useRssContentStore} from "@/shared/storage/rss-content-store.ts";
import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import {useSettingsStore, useSettingsStoreAsync} from "@/shared/storage/settings-store.ts";
import {userConfigStoreAsync} from "@/shared/storage/user-config-store.ts";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Input} from "@/shared/ui/kit/input.tsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/kit/dialog.tsx";
import {RssContent} from "@/features/rss-list/rss-content.tsx";
import {cn} from "@/shared/lib/css";
import {
    deleteRssItem,
    getRssFullText,
    getRssUnreadCount,
    markRssRead,
    markRssUnread,
    refreshAllFeeds,
    restoreRssItem,
    setStatusRssRead,
} from "@/shared/api/api.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";
import type {RssFullText, RssItem} from "@/shared/model/types.ts";

const ALL_FEEDS = "__all__";
const LAYOUTS = ["three", "list", "split"] as const;
type Layout = (typeof LAYOUTS)[number];

const SHORTCUTS: {keys: string; label: string}[] = [
    {keys: "/", label: "Focus search"},
    {keys: "↓ / j", label: "Next headline"},
    {keys: "↑ / k", label: "Previous headline"},
    {keys: "Enter", label: "Open original"},
    {keys: "f", label: "Full text"},
    {keys: "r", label: "Refresh all feeds"},
    {keys: "m", label: "Toggle read"},
    {keys: "d", label: "Delete"},
    {keys: "u", label: "Undo delete"},
    {keys: "Esc", label: "Clear search / close"},
    {keys: "?", label: "This help"},
];

function formatDate(value?: string) {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function freshness(item: RssItem) {
    const parsed = Date.parse(item.pubDate || item.fetchedAt || "");
    return Number.isNaN(parsed) ? 0 : parsed;
}

function matchesSearch(item: RssItem, query: string) {
    const haystack = [
        item.title,
        item.link,
        item.feedName,
        item.description,
        item.itemPayload?.description,
    ].join(" ").toLowerCase();
    return query.split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

function RssListPage() {
    const rssList = useRssListAllStoreAsync((state) => state.getRssList);
    const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
    const userConfig = userConfigStoreAsync((state) => state.getUserConfig);
    const settings = useSettingsStoreAsync((state) => state.getUserSettings);
    const saveSettings = useSettingsStore((state) => state.saveUserSettings.trigger);

    const updateUserId = useRssListAllStore((state) => state.updateUserId);
    const {t} = useI18n();

    const [rssId, setRssId] = useState<number | null>(null);
    const [selectedFeed, setSelectedFeed] = useState<string>(ALL_FEEDS);
    const [search, setSearch] = useState("");
    const [refreshingAll, setRefreshingAll] = useState(false);
    const [fullText, setFullText] = useState<RssFullText | null>(null);
    const [fullTextLoading, setFullTextLoading] = useState(false);
    const [fullTextError, setFullTextError] = useState<string | null>(null);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const lastDeleted = useRef<number | null>(null);

    const userId = appConfig?.appConfigPayload?.defaultUserId ?? null;

    useEffect(() => {
        if (appConfig?.appConfigPayload) {
            updateUserId(appConfig.appConfigPayload.defaultUserId);
        }
    }, [appConfig, updateUserId]);

    const layout: Layout = (LAYOUTS as readonly string[]).includes(settings?.layout ?? "")
        ? (settings!.layout as Layout)
        : "three";
    const fontScales = settings?.fontScales ?? {feeds: 100, headlines: 100, content: 100};
    const columnWidths = settings?.columnWidths ?? {feeds: 220, headlines: 420};

    const invalidate = useCallback(() => {
        useRssListAllStore.getState().getRssList.markStale();
        useRssContentStore.getState().rss.markStale();
    }, []);

    const feeds = useMemo(() => {
        const list = userConfig?.userConfigPayload.groups.flatMap((group) => group.rssConfigs) ?? [];
        return list.map((feed) => ({
            uuid: feed.uuid,
            name: feed.name,
            icon: feed.icon,
            unread: rssList.filter((item) => item.rssUuid === feed.uuid).length,
        }));
    }, [userConfig, rssList]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return rssList
            .filter((item) => selectedFeed === ALL_FEEDS || item.rssUuid === selectedFeed)
            .filter((item) => !query || matchesSearch(item, query))
            .sort((a, b) => freshness(b) - freshness(a));
    }, [rssList, search, selectedFeed]);

    const activeId = useMemo(() => {
        if (rssId !== null && filtered.some((item) => item.id === rssId)) {
            return rssId;
        }
        return filtered[0]?.id ?? null;
    }, [filtered, rssId]);

    const selected = useMemo(
        () => rssList.find((item) => item.id === activeId) ?? null,
        [rssList, activeId]
    );

    const totalUnread = rssList.length;

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
        const currentIndex = filtered.findIndex((item) => item.id === activeId);
        const nextIndex = currentIndex < 0
            ? 0
            : Math.min(Math.max(currentIndex + delta, 0), filtered.length - 1);
        const nextItem = filtered[nextIndex];
        if (nextItem) {
            void select(nextItem);
        }
    }, [filtered, activeId, select]);

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
            lastDeleted.current = itemId;
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
                            lastDeleted.current = null;
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

    const undoDelete = useCallback(async () => {
        const itemId = lastDeleted.current;
        if (itemId === null) {
            return;
        }
        try {
            await restoreRssItem(itemId);
            lastDeleted.current = null;
            invalidate();
            setRssId(itemId);
        } catch {
            toast.error("Could not restore item.");
        }
    }, [invalidate]);

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

    const openOriginal = useCallback((item: RssItem) => {
        if (item.link) {
            window.open(item.link, "_blank", "noopener,noreferrer");
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

    const changeLayout = useCallback((next: Layout) => {
        if (!settings) {
            return;
        }
        void saveSettings({...settings, layout: next});
    }, [saveSettings, settings]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

            if (event.key === 'Escape') {
                if (shortcutsOpen) {
                    setShortcutsOpen(false);
                } else if (search) {
                    setSearch("");
                }
                (document.activeElement as HTMLElement | null)?.blur?.();
                return;
            }
            if (typing) {
                return;
            }
            if (event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }
            if (event.key === '/') {
                event.preventDefault();
                searchRef.current?.focus();
                return;
            }
            if (event.key === '?') {
                event.preventDefault();
                setShortcutsOpen((open) => !open);
                return;
            }

            switch (event.code) {
                case 'ArrowDown':
                case 'KeyJ':
                    event.preventDefault();
                    move(1);
                    break;
                case 'ArrowUp':
                case 'KeyK':
                    event.preventDefault();
                    move(-1);
                    break;
                case 'Enter':
                    if (selected) {
                        event.preventDefault();
                        openOriginal(selected);
                    }
                    break;
                case 'KeyM':
                    event.preventDefault();
                    if (selected) {
                        void (selected.status === 'READ' ? markUnread(selected) : markRead(selected));
                    }
                    break;
                case 'KeyF':
                    event.preventDefault();
                    if (selected) {
                        void loadFullText(selected);
                    }
                    break;
                case 'KeyR':
                    event.preventDefault();
                    void refreshAll();
                    break;
                case 'KeyD':
                case 'Delete':
                    event.preventDefault();
                    if (selected) {
                        void deleteItem(selected);
                    }
                    break;
                case 'KeyU':
                    event.preventDefault();
                    void undoDelete();
                    break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [deleteItem, loadFullText, markRead, markUnread, move, openOriginal, refreshAll, search, selected, shortcutsOpen, undoDelete]);

    useEffect(() => {
        if (!userId) {
            return;
        }
        let active = true;
        const tick = async () => {
            try {
                const {unread} = await getRssUnreadCount(() => ({userId}))();
                if (active) {
                    document.title = unread > 99 ? "(99+) RssReader" : unread > 0 ? `(${unread}) RssReader` : "RssReader";
                }
            } catch {
                // ignore polling errors
            }
        };
        void tick();
        const timer = window.setInterval(() => void tick(), 60_000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [userId]);

    const showFeeds = layout === "three";
    const showContent = layout !== "list";

    return (
        <div className="flex h-screen" data-layout={layout}>
            {showFeeds && (
                <aside
                    className="flex shrink-0 flex-col border-r"
                    style={{width: columnWidths.feeds, fontSize: `${fontScales.feeds}%`}}
                >
                    <div className="border-b px-3 py-2 text-sm font-medium">{t("reader.feeds")}</div>
                    <div className="grow overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => setSelectedFeed(ALL_FEEDS)}
                            className={cn(
                                "flex w-full items-center justify-between border-b px-3 py-2 text-left hover:bg-accent",
                                selectedFeed === ALL_FEEDS && "bg-accent"
                            )}
                        >
                            <span>{t("reader.allFeeds")}</span>
                            <span className="text-xs text-muted-foreground">{totalUnread}</span>
                        </button>
                        {feeds.map((feed) => (
                            <button
                                key={feed.uuid}
                                type="button"
                                onClick={() => setSelectedFeed(feed.uuid)}
                                className={cn(
                                    "flex w-full items-center justify-between border-b px-3 py-2 text-left hover:bg-accent",
                                    selectedFeed === feed.uuid && "bg-accent"
                                )}
                            >
                                <span className="flex items-center gap-2 truncate">
                                    {feed.icon && <img src={feed.icon} alt="" className="h-4 w-4"/>}
                                    <span className="truncate">{feed.name}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">{feed.unread}</span>
                            </button>
                        ))}
                    </div>
                </aside>
            )}

            <aside
                className="flex shrink-0 flex-col border-r"
                style={{width: layout === "list" ? "100%" : columnWidths.headlines, fontSize: `${fontScales.headlines}%`}}
            >
                <div className="flex gap-2 border-b p-2">
                    <Input
                        ref={searchRef}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t("reader.search")}
                    />
                    <Button size="sm" onClick={() => void refreshAll()} disabled={refreshingAll}>
                        {refreshingAll ? t("reader.refreshing") : t("reader.refresh")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts">
                        ?
                    </Button>
                </div>
                <div className="flex items-center gap-1 border-b px-2 py-1">
                    {LAYOUTS.map((option) => (
                        <Button
                            key={option}
                            size="sm"
                            variant={layout === option ? "secondary" : "ghost"}
                            onClick={() => changeLayout(option)}
                        >
                            {option}
                        </Button>
                    ))}
                    <span className="ml-auto text-xs text-muted-foreground">
                        {filtered.length} {t("reader.shown")} / {totalUnread} {t("reader.unread")}
                    </span>
                </div>
                <div className="grow overflow-y-auto">
                    {filtered.map((item) => (
                        <button
                            key={item.id ?? item.link}
                            type="button"
                            onClick={() => void select(item)}
                            className={cn(
                                "block w-full border-b px-3 py-2 text-left hover:bg-accent",
                                item.id === activeId && "bg-accent",
                                item.status === 'READ' ? "text-muted-foreground" : "font-medium"
                            )}
                        >
                            <div className="line-clamp-2">{item.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                {item.feedName ?? t("reader.unknownFeed")} · {formatDate(item.pubDate)}
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            {showContent && (
                <main className="grow overflow-y-auto p-4" style={{fontSize: `${fontScales.content}%`}}>
                    <RssContent
                        rssId={activeId}
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
            )}

            <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("reader.shortcuts")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-1">
                        {SHORTCUTS.map((shortcut) => (
                            <div key={shortcut.keys} className="flex justify-between border-b py-1 text-sm">
                                <span className="font-mono">{shortcut.keys}</span>
                                <span className="text-muted-foreground">{shortcut.label}</span>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export const Component = RssListPage;
