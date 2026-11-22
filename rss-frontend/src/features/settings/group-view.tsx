import {useState} from "react";
import {toast} from "sonner";
import type {Group, RssConfig, UserConfig} from "@/shared/model/types.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/shared/ui/kit/table";
import {Badge} from "@/shared/ui/kit/badge.tsx";
import {userConfigStore, userConfigStoreAsync} from "@/shared/storage/user-config-store.ts";
import {useRssListAllStore} from "@/shared/storage/rss-list-all-store.ts";
import {GroupDelete} from "@/features/settings/group-delete.tsx";
import {RssDelete} from "@/features/settings/rss-delete.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Pencil, PlusCircle, RefreshCw} from "lucide-react";
import useGroupModifyStore from "@/shared/storage/group-modify-store.ts";
import useRssModifyStore from "@/shared/storage/rss-modify-store.ts";
import {refreshFeed} from "@/shared/api/api.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";

export type GroupViewProps = {
  group: Group;
  deleteGroupHandler?: (uuid: string) => void | undefined;
  modifyGroupHandler?: (group: Group) => void | undefined;
}

type Health = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  tooltip: string;
};

function health(rssConfig: RssConfig, t: (key: string, params?: Record<string, string | number>) => string): Health {
  const lastError = rssConfig.lastErrorAt ? new Date(rssConfig.lastErrorAt).getTime() : 0;
  const lastOk = rssConfig.lastOkAt ? new Date(rssConfig.lastOkAt).getTime() : 0;

  if (lastError && lastError >= lastOk) {
    return {
      label: t("health.error"),
      variant: "destructive",
      tooltip: rssConfig.lastErrorMessage ?? rssConfig.lastErrorAt ?? t("health.lastFailed"),
    };
  }

  if (rssConfig.nextRetryAt) {
    return {
      label: t("health.retry"),
      variant: "secondary",
      tooltip: t("health.nextRetry", {time: rssConfig.nextRetryAt}),
    };
  }

  if (rssConfig.lastOkAt) {
    return {
      label: t("health.ok"),
      variant: "outline",
      tooltip: t("health.lastOk", {time: rssConfig.lastOkAt}),
    };
  }

  return {
    label: t("health.new"),
    variant: "outline",
    tooltip: t("health.noFetch"),
  };
}

export function GroupView(props: GroupViewProps) {

  const userConfig = userConfigStoreAsync((state) => state.getUserConfig);
  const saveUserConfig = userConfigStore((state) => state.saveUserConfig.trigger);
  const { openGroupModify } = useGroupModifyStore();
  const { openRssModify } = useRssModifyStore();
  const { t } = useI18n();
  const group = props.group;
  const [refreshingUuid, setRefreshingUuid] = useState<string | null>(null);

  function deleteGroupHandler(uuid: string) {
    props.deleteGroupHandler?.(uuid);
  }

  async function updateGroup(updatedGroup: Group) {
    if (!userConfig) return;
    const updatedUserConfig: UserConfig = {
      ...userConfig,
      userConfigPayload: {
        ...userConfig.userConfigPayload,
        groups: userConfig.userConfigPayload.groups.map((item) =>
          item.uuid === updatedGroup.uuid ? updatedGroup : item
        ),
      },
    };
    await saveUserConfig(updatedUserConfig);
    useRssListAllStore.getState().getRssList.markStale();
  }

  function deleteRssHandle(uuid: string) {
    console.log("delete rss config uuid:" + JSON.stringify(uuid));
    void updateGroup({
      ...group,
      rssConfigs: group.rssConfigs.filter((obj) => obj.uuid !== uuid),
    });
  }

  function saveRssHandler(rssConfig: RssConfig) {
    console.log("Save" + JSON.stringify(rssConfig));
    void updateGroup({
      ...group,
      rssConfigs: group.rssConfigs
        .filter((obj) => obj.uuid !== rssConfig.uuid)
        .concat(rssConfig),
    });
  }

  async function refreshFeedHandler(rssConfig: RssConfig) {
    if (!userConfig) return;
    setRefreshingUuid(rssConfig.uuid);
    try {
      const result = await refreshFeed(() => ({userId: userConfig.id}))(rssConfig.uuid);
      if (!result) {
        toast.warning(t("common.noUser"));
      } else if (result.busy) {
        toast.warning(t("group.busy", {name: rssConfig.name}));
      } else if (!result.ok) {
        toast.error(result.error ?? t("group.failed", {name: rssConfig.name}));
      } else {
        toast.success(t("group.refreshed", {name: rssConfig.name, added: result.added}) + (result.notModified ? t("group.notModified") : ""));
      }
      useRssListAllStore.getState().getRssList.markStale();
    } catch {
      toast.error(t("group.refreshError"));
    } finally {
      setRefreshingUuid(null);
    }
  }

  return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.url")}</TableHead>
              <TableHead>{t("group.refreshCron")}</TableHead>
              <TableHead>{t("group.status")}</TableHead>
              <TableHead>{t("group.action")}&nbsp;&nbsp;&nbsp;
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" aria-label={t("group.addRss")} onClick={() =>{
                      openRssModify({
                        title: t("group.addRss"),
                        description: t("group.addRss"),
                        cancelLabel: t("common.cancel"),
                        actionLabel: t("common.add"),
                        onAction: (rssConfig: RssConfig) => {saveRssHandler(rssConfig) },
                        onCancel: () => { },
                        rssConfig: undefined
                      });
                    }}>
                      <PlusCircle/>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("group.addRss")}</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.group?.rssConfigs?.map((rssConfig) => {
              const feedHealth = health(rssConfig, t);
              return (
                <TableRow key={rssConfig.uuid}>
                  <TableCell>{rssConfig.name}</TableCell>
                  <TableCell>{rssConfig.url}</TableCell>
                  <TableCell>{rssConfig.refreshCronExpression}</TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant={feedHealth.variant}>{feedHealth.label}</Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{feedHealth.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={t("group.loadNow")}
                          disabled={refreshingUuid === rssConfig.uuid}
                          onClick={() => void refreshFeedHandler(rssConfig)}
                        >
                          <RefreshCw/>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("group.loadNow")}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" aria-label={t("group.modifyRss")} onClick={() =>{
                          openRssModify({
                                            title: t("group.modifyRss"),
                                            description: t("group.modifyRss"),
                                            cancelLabel: t("common.cancel"),
                                            actionLabel: t("common.modify"),
                                            onAction: (rssConfig: RssConfig) => {saveRssHandler(rssConfig) },
                          onCancel: () => { },
                          rssConfig: rssConfig
                        });
                        }}>
                          <Pencil/>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("group.modifyRss")}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/*<RssEdit rssConfig={rssConfig} saveHandler={saveRssHandler}/>*/}
                    <RssDelete uuid={rssConfig.uuid} deleteRssHandler={deleteRssHandle}/>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label={t("group.modifyGroup")} onClick={() => {
              openGroupModify({
                title: t("settings.groups.modifyTitle"),
                description: t("settings.groups.modifyDesc"),
                cancelLabel: t("common.cancel"),
                actionLabel: t("common.modify"),
                onAction: (group: Group) => {props.modifyGroupHandler?.(group) },
                onCancel: () => { },
                group: group
              });
            }}>
              <Pencil/>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("group.modifyGroup")}</p>
          </TooltipContent>
        </Tooltip>
        <GroupDelete deleteGroupHandler={deleteGroupHandler} uuid={props.group.uuid}/>
      </>
  );
}
