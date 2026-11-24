import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {toast} from "sonner";
import {useRssListAllStore, useRssListAllStoreAsync} from "@/shared/storage/rss-list-all-store.ts";
import {useRssContentStore} from "@/shared/storage/rss-content-store.ts";
import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import {useSettingsStore, useSettingsStoreAsync} from "@/shared/storage/settings-store.ts";
import {userConfigStoreAsync} from "@/shared/storage/user-config-store.ts";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Input} from "@/shared/ui/kit/input.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {RefreshCw} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/kit/dialog.tsx";
import {RssContent} from "@/features/rss-list/rss-content.tsx";
import {FeedIcon} from "@/shared/ui/components/feed/feed-icon.tsx";
import {resolveLayout} from "@/shared/model/layout.ts";
import {cn} from "@/shared/lib/css";
import {useDragHeight, useDragWidth} from "@/shared/lib/use-column-resize.ts";
import {useUnreadBadge} from "@/shared/lib/use-unread-badge.ts";
import {
    deleteRssItem,
    getRssFullText,
    markRssRead,
    markRssUnread,
    refreshAllFeeds,
    restoreRssItem,
    setStatusRssRead,
} from "@/shared/api/api.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";
import type {RssFullText, RssItem} from "@/shared/model/types.ts";

const ALL_FEEDS = "__all__";

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

function selectionKey(userId: number) {
    return `rss-reader:selection:${userId}`;
}

function readSelection(userId: number | null): {feed: string; rssId: number | null} | null {
    if (userId === null) {
        return null;
    }
    try {
        const raw = localStorage.getItem(selectionKey(userId));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as {feed?: unknown; rssId?: unknown};
        return {
            feed: typeof parsed.feed === "string" ? parsed.feed : ALL_FEEDS,
            rssId: typeof parsed.rssId === "number" ? parsed.rssId : null,
        };
    } catch {
        return null;
    }
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
    const refreshUnread = useUnreadBadge(userId);

    useEffect(() => {
        if (appConfig?.appConfigPayload) {
            updateUserId(appConfig.appConfigPayload.defaultUserId);
        }
    }, [appConfig, updateUserId]);

    const restoredFor = useRef<number | null>(null);
    useEffect(() => {
        if (userId === null || restoredFor.current === userId) {
            return;
        }
        queueMicrotask(() => {
            const saved = readSelection(userId);
            if (saved) {
                setSelectedFeed(saved.feed);
                setRssId(saved.rssId);
            }
            restoredFor.current = userId;
        });
    }, [userId]);

    const layout = resolveLayout(settings?.layout);
    const fontScales = settings?.fontScales ?? {feeds: 100, headlines: 100, content: 100};
    const columnWidths = settings?.columnWidths ?? {feeds: 220, headlines: 420};
    const rowHeights = settings?.rowHeights ?? {headlines: 72, content: 320};

    const [widths, setWidths] = useState<{ feeds: number; headlines: number; content: number } | null>(null);
    if (widths === null && settings) {
        setWidths({
            feeds: settings.columnWidths.feeds,
            headlines: settings.columnWidths.headlines,
            content: settings.rowHeights.content,
        });
    }
    const effectiveWidths = useMemo(
        () => widths ?? {feeds: columnWidths.feeds, headlines: columnWidths.headlines, content: rowHeights.content},
        [widths, columnWidths.feeds, columnWidths.headlines, rowHeights.content]
    );
    const widthsRef = useRef(effectiveWidths);
    useEffect(() => {
        widthsRef.current = effectiveWidths;
    }, [effectiveWidths]);

    const persistWidths = useCallback((patch: Partial<{ feeds: number; headlines: number }>) => {
        if (!settings) {
            return;
        }
        const merged = {...widthsRef.current, ...patch};
        void saveSettings({...settings, columnWidths: {...settings.columnWidths, feeds: merged.feeds, headlines: merged.headlines}});
    }, [saveSettings, settings]);

    const persistContentHeight = useCallback((content: number) => {
        if (!settings) {
            return;
        }
        void saveSettings({...settings, rowHeights: {...settings.rowHeights, content}});
    }, [saveSettings, settings]);

    const getFeedsWidth = useCallback(() => widthsRef.current.feeds, []);
    const getHeadlinesWidth = useCallback(() => widthsRef.current.headlines, []);
    const getContentHeight = useCallback(() => widthsRef.current.content, []);
    const setFeedsWidth = useCallback((value: number) => setWidths((prev) => ({...(prev ?? widthsRef.current), feeds: value})), []);
    const setHeadlinesWidth = useCallback((value: number) => setWidths((prev) => ({...(prev ?? widthsRef.current), headlines: value})), []);
    const setContentHeight = useCallback((value: number) => setWidths((prev) => ({...(prev ?? widthsRef.current), content: value})), []);
    const commitFeedsWidth = useCallback((value: number) => persistWidths({feeds: value}), [persistWidths]);
    const commitHeadlinesWidth = useCallback((value: number) => persistWidths({headlines: value}), [persistWidths]);
    const commitContentHeight = useCallback((value: number) => persistContentHeight(value), [persistContentHeight]);

    const onFeedsResize = useDragWidth(getFeedsWidth, 160, setFeedsWidth, commitFeedsWidth);
    const onHeadlinesResize = useDragWidth(getHeadlinesWidth, 240, setHeadlinesWidth, commitHeadlinesWidth);
    const onContentResize = useDragHeight(getContentHeight, 120, setContentHeight, commitContentHeight);

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

    const feedById = useMemo(() => {
        const map = new Map<string, { icon?: string; name: string }>();
        for (const feed of feeds) {
            map.set(feed.uuid, {icon: feed.icon, name: feed.name});
        }
        return map;
    }, [feeds]);

    const isOutlook = layout === "outlook";
    const showFeeds = layout === "three" || isOutlook;
    const visibleFeed = showFeeds ? selectedFeed : ALL_FEEDS;

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return rssList
            .filter((item) => visibleFeed === ALL_FEEDS || item.rssUuid === visibleFeed)
            .filter((item) => !query || matchesSearch(item, query))
            .sort((a, b) => freshness(b) - freshness(a));
    }, [rssList, search, visibleFeed]);

    const activeId = useMemo(() => {
        if (rssId !== null && filtered.some((item) => item.id === rssId)) {
            return rssId;
        }
        return filtered[0]?.id ?? null;
    }, [filtered, rssId]);

    useEffect(() => {
        if (userId === null || restoredFor.current !== userId) {
            return;
        }
        try {
            localStorage.setItem(selectionKey(userId), JSON.stringify({feed: selectedFeed, rssId: activeId}));
        } catch {
            // selection restore is best effort
        }
    }, [userId, selectedFeed, activeId]);

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
                void refreshUnread();
            } catch {
                toast.error(t("reader.markReadError"));
            }
        }
    }, [appConfig, invalidate, refreshUnread, t]);

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
            void refreshUnread();
        } catch {
            toast.error(t("reader.markReadError"));
        }
    }, [invalidate, refreshUnread, t]);

    const markUnread = useCallback(async (item: RssItem) => {
        if (item.id === null) {
            return;
        }
        try {
            await markRssUnread(item.id);
            invalidate();
            void refreshUnread();
        } catch {
            toast.error(t("reader.markUnreadError"));
        }
    }, [invalidate, refreshUnread, t]);

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
            void refreshUnread();
            toast(t("reader.deleted"), {
                action: {
                    label: t("reader.undo"),
                    onClick: async () => {
                        try {
                            await restoreRssItem(itemId);
                            lastDeleted.current = null;
                            invalidate();
                            void refreshUnread();
                            setRssId(itemId);
                        } catch {
                            toast.error(t("reader.restoreError"));
                        }
                    },
                },
            });
        } catch {
            toast.error(t("reader.deleteError"));
        }
    }, [invalidate, refreshUnread, rssId, t]);

    const undoDelete = useCallback(async () => {
        const itemId = lastDeleted.current;
        if (itemId === null) {
            return;
        }
        try {
            await restoreRssItem(itemId);
            lastDeleted.current = null;
            invalidate();
            void refreshUnread();
            setRssId(itemId);
        } catch {
            toast.error(t("reader.restoreError"));
        }
    }, [invalidate, refreshUnread, t]);

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
            setFullTextError(t("reader.fullTextError"));
        } finally {
            setFullTextLoading(false);
        }
    }, [t]);

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
                toast.warning(t("common.noUser"));
                return;
            }
            const added = result.results.reduce((sum, feed) => sum + feed.added, 0);
            if (result.failed > 0) {
                toast.warning(t("reader.refreshSummaryFailed", {added, failed: result.failed}));
            } else {
                toast.success(t("reader.refreshSummary", {added}));
            }
            invalidate();
            void refreshUnread();
        } catch {
            toast.error(t("reader.refreshError"));
        } finally {
            setRefreshingAll(false);
        }
    }, [invalidate, refreshUnread, userId, t]);

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

    const headlinesPane = (
        <aside
            className="flex shrink-0 flex-col border-r"
            style={isOutlook
                ? {height: effectiveWidths.content, flexBasis: effectiveWidths.content, fontSize: `${fontScales.headlines}%`}
                : {width: effectiveWidths.headlines, fontSize: `${fontScales.headlines}%`}}
        >
            <div className="flex gap-2 border-b p-2">
                <Input
                    ref={searchRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("reader.search")}
                />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label={refreshingAll ? t("reader.refreshing") : t("reader.refresh")}
                            onClick={() => void refreshAll()}
                            disabled={refreshingAll}
                        >
                            <RefreshCw className={cn(refreshingAll && "animate-spin")}/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{refreshingAll ? t("reader.refreshing") : t("reader.refresh")}</p>
                    </TooltipContent>
                </Tooltip>
                <Button size="sm" variant="outline" onClick={() => setShortcutsOpen(true)} aria-label={t("reader.shortcuts")}>
                    ?
                </Button>
            </div>
            <div className="flex items-center gap-1 border-b px-2 py-1">
                <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
                    {filtered.length} {t("reader.shown")} / {totalUnread} {t("reader.unread")}
                </span>
            </div>
            <div className="grow overflow-y-auto" role="listbox" aria-label={t("reader.headlines")}>
                {filtered.map((item) => (
                    <button
                        key={item.id ?? item.link}
                        type="button"
                        role="option"
                        aria-selected={item.id === activeId}
                        aria-current={item.id === activeId ? "true" : undefined}
                        onClick={() => void select(item)}
                        style={{minHeight: rowHeights.headlines}}
                        className={cn(
                            "flex w-full gap-2 border-b px-3 py-2 text-left hover:bg-accent",
                            item.id === activeId && "bg-accent",
                            item.status === 'READ' ? "text-muted-foreground" : "font-medium"
                        )}
                    >
                        <FeedIcon
                            src={feedById.get(item.rssUuid)?.icon}
                            name={item.feedName ?? feedById.get(item.rssUuid)?.name}
                            className="mt-0.5"
                        />
                        <span className="min-w-0 grow">
                            <span className="line-clamp-2">{item.title}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                                {item.feedName ?? t("reader.unknownFeed")} · {formatDate(item.pubDate)}
                            </span>
                        </span>
                    </button>
                ))}
            </div>
        </aside>
    );

    const contentPane = (
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
    );

    const headlinesSeparator = (
        <div
            onPointerDown={onHeadlinesResize}
            role="separator"
            aria-orientation="vertical"
            aria-label={t("reader.headlines")}
            className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40"
        />
    );

    const contentSeparator = (
        <div
            onPointerDown={onContentResize}
            role="separator"
            aria-orientation="horizontal"
            aria-label={t("reader.headlines")}
            className="h-1 shrink-0 cursor-row-resize bg-border hover:bg-primary/40"
        />
    );

    return (
        <div className="flex h-screen" data-layout={layout} data-testid="reader-root">
            {showFeeds && (
                <>
                    <aside
                        className="flex shrink-0 flex-col border-r"
                        style={{width: effectiveWidths.feeds, fontSize: `${fontScales.feeds}%`}}
                    >
                    <div className="border-b px-3 py-2 text-sm font-medium">{t("reader.feeds")}</div>
                    <div className="grow overflow-y-auto" role="listbox" aria-label={t("reader.feeds")}>
                        <button
                            type="button"
                            role="option"
                            aria-selected={selectedFeed === ALL_FEEDS}
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
                                role="option"
                                aria-selected={selectedFeed === feed.uuid}
                                onClick={() => setSelectedFeed(feed.uuid)}
                                className={cn(
                                    "flex w-full items-center justify-between border-b px-3 py-2 text-left hover:bg-accent",
                                    selectedFeed === feed.uuid && "bg-accent"
                                )}
                            >
                                <span className="flex items-center gap-2 truncate">
                                    <FeedIcon src={feed.icon} name={feed.name}/>
                                    <span className="truncate">{feed.name}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">{feed.unread}</span>
                            </button>
                        ))}
                    </div>
                    </aside>
                    <div
                        onPointerDown={onFeedsResize}
                        role="separator"
                        aria-orientation="vertical"
                        className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40"
                    />
                </>
            )}

            {isOutlook ? (
                <div className="flex min-w-0 grow flex-col">
                    {headlinesPane}
                    {contentSeparator}
                    {contentPane}
                </div>
            ) : (
                <>
                    {headlinesPane}
                    {headlinesSeparator}
                    {contentPane}
                </>
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
