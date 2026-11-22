import { create } from "zustand";
import type {RssConfig} from "@/shared/model/types.ts";

interface RssModifyState {
  open: boolean;
  title: string | null;
  description: string | null;
  cancelLabel: string | null;
  actionLabel: string | null;
  onAction: (rssConfig: RssConfig) => void;
  onCancel: () => void;
  rssConfig: RssConfig | undefined;
}

interface RssModifyActions {
  openRssModify: (data: {
    title: string;
    description: string;
    cancelLabel: string;
    actionLabel: string;
    onAction: (rssConfig: RssConfig) => void;
    onCancel: () => void;
    rssConfig: RssConfig | undefined;
  }) => void;
  closeRssModify: () => void;
}

const useRssModifyStore = create<RssModifyState & RssModifyActions>(
    (set) => ({
      open: false,
      title: null,
      description: null,
      cancelLabel: null,
      actionLabel: null,
      onAction: () => {},
      onCancel: () => {},
      rssConfig: undefined,
      openRssModify: (data) =>
          set(() => ({
            open: true,
            title: data.title,
            description: data.description,
            cancelLabel: data.cancelLabel,
            actionLabel: data.actionLabel,
            onAction: data.onAction,
            onCancel: data.onCancel,
            rssConfig: data.rssConfig,
          })),
      closeRssModify: () =>
          set(() => ({
            open: false,
            title: null,
            description: null,
            cancelLabel: null,
            actionLabel: null,
            onAction: () => {},
            onCancel: () => {},
            rssConfig: undefined
          })),
    })
);

export default useRssModifyStore;