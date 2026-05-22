import { create } from "zustand";
import type {Group} from "@/shared/model/types.ts";

interface GroupModifyState {
  open: boolean;
  title: string | null;
  description: string | null;
  cancelLabel: string | null;
  actionLabel: string | null;
  onAction: (group: Group) => void;
  onCancel: () => void;
  group: Group | undefined;
}

interface GroupModifyActions {
  openGroupModify: (data: {
    title: string;
    description: string;
    cancelLabel: string;
    actionLabel: string;
    onAction: (group: Group) => void;
    onCancel: () => void;
    group: Group | undefined;
  }) => void;
  closeGroupModify: () => void;
}

const useGroupModifyStore = create<GroupModifyState & GroupModifyActions>(
    (set) => ({
      open: false,
      title: null,
      description: null,
      cancelLabel: null,
      actionLabel: null,
      onAction: (group: Group) => {},
      onCancel: () => {},
      group: undefined,
      openGroupModify: (data) =>
          set((state) => ({
            open: true,
            title: data.title,
            description: data.description,
            cancelLabel: data.cancelLabel,
            actionLabel: data.actionLabel,
            onAction: data.onAction,
            onCancel: data.onCancel,
            group: data.group,
          })),
      closeGroupModify: () =>
          set((state) => ({
            open: false,
            title: null,
            description: null,
            cancelLabel: null,
            actionLabel: null,
            onAction: (group: Group) => {},
            onCancel: () => {},
            group: undefined
          })),
    })
);

export default useGroupModifyStore;