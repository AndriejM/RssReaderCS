import {useRef, useState} from "react";
import {toast} from "sonner";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/shared/ui/kit/card";
import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import {userConfigStore, userConfigStoreAsync} from "@/shared/storage/user-config-store.ts";
import {useRssListAllStore} from "@/shared/storage/rss-list-all-store.ts";
import useConfirmationStore from "@/shared/storage/confirmation-store.ts";
import {exportFeeds, forgetReadMarkers, importFeeds} from "@/shared/api/api.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";
import type {FeedExport} from "@/shared/model/types.ts";

export function FeedsSettings() {
    const {t} = useI18n();
    const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
    const userConfig = userConfigStoreAsync((state) => state.getUserConfig);
    const {openConfirmation} = useConfirmationStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    const userId = appConfig?.appConfigPayload?.defaultUserId ?? userConfig?.id ?? null;
    const feedCount = userConfig?.userConfigPayload.groups.reduce((sum, group) => sum + group.rssConfigs.length, 0) ?? 0;

    async function exportHandler() {
        if (userId === null) {
            toast.warning(t("settings.feeds.noUser"));
            return;
        }
        setBusy(true);
        try {
            const data = await exportFeeds(userId);
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `rss-feeds-${userId}.json`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(t("settings.feeds.exported"));
        } catch {
            toast.error(t("settings.feeds.exportError"));
        } finally {
            setBusy(false);
        }
    }

    async function importHandler(file: File) {
        if (userId === null) {
            toast.warning(t("settings.feeds.noUser"));
            return;
        }
        setBusy(true);
        try {
            const data = JSON.parse(await file.text()) as FeedExport;
            if (!Array.isArray(data.feeds)) {
                throw new Error("Invalid feeds file.");
            }
            const result = await importFeeds(userId, data);
            if (!result.ok) {
                toast.error(result.error ?? t("settings.feeds.importError"));
                return;
            }
            userConfigStore.getState().getUserConfig.markStale();
            useRssListAllStore.getState().getRssList.markStale();
            toast.success(t("settings.feeds.imported", {added: result.added, skipped: result.skipped}));
        } catch {
            toast.error(t("settings.feeds.importError"));
        } finally {
            setBusy(false);
        }
    }

    function forgetHandler() {
        if (userId === null) {
            toast.warning(t("settings.feeds.noUser"));
            return;
        }
        openConfirmation({
            title: t("settings.feeds.forgetTitle"),
            description: t("settings.feeds.forgetDesc"),
            cancelLabel: t("common.cancel"),
            actionLabel: t("settings.feeds.forgetAction"),
            onAction: async () => {
                try {
                    await forgetReadMarkers(userId);
                    useRssListAllStore.getState().getRssList.markStale();
                    toast.success(t("settings.feeds.forgotten"));
                } catch {
                    toast.error(t("settings.feeds.forgetError"));
                }
            },
            onCancel: () => {
            },
        });
    }

    return (
        <div className="flex justify-center pt-5">
            <Card className="w-3/4">
                <CardHeader>
                    <CardTitle>{t("settings.feeds.title")}</CardTitle>
                    <CardAction>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => void exportHandler()} disabled={busy || userId === null}>
                                {t("settings.feeds.export")}
                            </Button>
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy || userId === null}>
                                {t("settings.feeds.import")}
                            </Button>
                            <Button variant="destructive" onClick={forgetHandler} disabled={busy || userId === null}>
                                {t("settings.feeds.forgetRead")}
                            </Button>
                        </div>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                                void importHandler(file);
                            }
                            event.target.value = "";
                        }}
                    />
                    <p className="text-sm text-muted-foreground">
                        {t("settings.feeds.count", {count: feedCount})}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
