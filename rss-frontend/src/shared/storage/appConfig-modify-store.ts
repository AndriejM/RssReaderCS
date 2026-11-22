import {create} from "zustand";
import type {AppConfig} from "@/shared/model/types.ts";

interface AppConfigModifyState {
  open: boolean;
  title: string | null;
  description: string | null;
  cancelLabel: string | null;
  actionLabel: string | null;
  onAction: (appConfig: AppConfig) => void;
  onCancel: () => void;
  appConfig: AppConfig | undefined;
}

interface AppConfigModifyActions {
  openAppConfigModify: (data: {
    title: string;
    description: string;
    cancelLabel: string;
    actionLabel: string;
    onAction: (appConfig: AppConfig) => void;
    onCancel: () => void;
    appConfig: AppConfig | undefined;
  }) => void;
  closeAppConfigModify: () => void;
}

const useAppConfigModifyStore = create<AppConfigModifyState & AppConfigModifyActions>(
    (set) => ({
      open: false,
      title: null,
      description: null,
      cancelLabel: null,
      actionLabel: null,
      onAction: () => {
      },
      onCancel: () => {
      },
      appConfig: undefined,
      openAppConfigModify: (data) =>
          set(() => ({
            open: true,
            title: data.title,
            description: data.description,
            cancelLabel: data.cancelLabel,
            actionLabel: data.actionLabel,
            onAction: data.onAction,
            onCancel: data.onCancel,
            appConfig: data.appConfig
          })),
      closeAppConfigModify: () =>
          set(() => ({
            open: false,
            title: null,
            description: null,
            cancelLabel: null,
            actionLabel: null,
            onAction: () => {},
            onCancel: () => {
            },
            appConfig: undefined
          })),
    })
);

export default useAppConfigModifyStore;