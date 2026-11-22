import {type Query, hook, query} from "leo-query";
import {create} from "zustand";
import type {RssItem} from "@/shared/model/types.ts";
import {getRssById} from "@/shared/api/api.ts";

export interface RssContentStore {
    rss: Query<RssContentStore, RssItem | null>;
    rssId: number | null;
    updateRssId: (rssId: number | null) => void;
}

export const useRssContentStore = create<RssContentStore>((set, get) => ({
    // refetch, когда меняется rssId
    rss: query(async () => {
        const id = get().rssId;
        if (id === null) {
            return null;
        }
        return await getRssById(id);
    }, (s) => [s.rssId]),
    rssId: null,
    updateRssId: (rssId: number | null) => set(() => ({ rssId })),
}));

export const useRssContentStoreAsync = hook(useRssContentStore);