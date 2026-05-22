import {type Effect, effect, hook, type Query, query} from "leo-query";
import {create} from "zustand";
import type {RssItem} from "@/shared/model/types.ts";
import {getRssListByUser, setStatusRssRead} from "@/shared/api/api.ts";

export interface RssListAllStore {
  getRssList: Query<RssListAllStore, RssItem[]>;
  setRssStatus: Effect<RssListAllStore, [number]>;
  userId: number | null;
  updateUserId: (userId: number) => void;
}

export const useRssListAllStore = create<RssListAllStore>((set, get) => ({
  getRssList: query(getRssListByUser(get), (s) => [s.setRssStatus, s.userId]), //invalidate todos when createTodo succeeds
  setRssStatus: effect(setStatusRssRead),
  userId: null,
  updateUserId: (userId: number) => set(() => ({ userId: userId })),
}));

export const useRssListAllStoreAsync = hook(useRssListAllStore);