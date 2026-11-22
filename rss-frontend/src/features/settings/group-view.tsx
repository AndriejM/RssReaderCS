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

function health(rssConfig: RssConfig): Health {
  const lastError = rssConfig.lastErrorAt ? new Date(rssConfig.lastErrorAt).getTime() : 0;
  const lastOk = rssConfig.lastOkAt ? new Date(rssConfig.lastOkAt).getTime() : 0;

  if (lastError && lastError >= lastOk) {
    return {
      label: "Error",
      variant: "destructive",
      tooltip: rssConfig.lastErrorMessage ?? rssConfig.lastErrorAt ?? "Last fetch failed",
    };
  }

  if (rssConfig.nextRetryAt) {
    return {
      label: "Retry",
      variant: "secondary",
      tooltip: `Next retry: ${rssConfig.nextRetryAt}`,
    };
  }

  if (rssConfig.lastOkAt) {
    return {
      label: "OK",
      variant: "outline",
      tooltip: `Last ok: ${rssConfig.lastOkAt}`,
    };
  }

  return {
    label: "New",
    variant: "outline",
    tooltip: "No fetch yet",
  };
}

export function GroupView(props: GroupViewProps) {

  const userConfig = userConfigStoreAsync((state) => state.getUserConfig);
  const saveUserConfig = userConfigStore((state) => state.saveUserConfig.trigger);
  const { openGroupModify } = useGroupModifyStore();
  const { openRssModify } = useRssModifyStore();
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
        toast.warning("No user selected.");
      } else if (result.busy) {
        toast.warning(`${rssConfig.name} is busy.`);
      } else if (!result.ok) {
        toast.error(result.error ?? `${rssConfig.name} failed.`);
      } else {
        toast.success(`${rssConfig.name}: +${result.added}${result.notModified ? " (not modified)" : ""}`);
      }
      useRssListAllStore.getState().getRssList.markStale();
    } catch {
      toast.error("Could not refresh feed.");
    } finally {
      setRefreshingUuid(null);
    }
  }

  return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Url</TableHead>
              <TableHead>Refresh Cron</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action&nbsp;&nbsp;&nbsp;
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Submit" onClick={() =>{
                      openRssModify({
                        title: "Add Rss config",
                        description: "Add Rss config",
                        cancelLabel: "Cancel",
                        actionLabel: "Add",
                        onAction: (rssConfig: RssConfig) => {saveRssHandler(rssConfig) },
                        onCancel: () => { },
                        rssConfig: undefined
                      });
                    }}>
                      <PlusCircle/>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add rss config</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.group?.rssConfigs?.map((rssConfig) => {
              const feedHealth = health(rssConfig);
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
                          aria-label="Load now"
                          disabled={refreshingUuid === rssConfig.uuid}
                          onClick={() => void refreshFeedHandler(rssConfig)}
                        >
                          <RefreshCw/>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Load now</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="Submit" onClick={() =>{
                          openRssModify({
                                            title: "Modify Rss config",
                                            description: "Modify Rss config",
                                            cancelLabel: "Cancel",
                                            actionLabel: "Modify",
                                            onAction: (rssConfig: RssConfig) => {saveRssHandler(rssConfig) },
                          onCancel: () => { },
                          rssConfig: rssConfig
                        });
                        }}>
                          <Pencil/>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Modify rss config</p>
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
            <Button variant="outline" size="icon" aria-label="Submit" onClick={() => {
              openGroupModify({
                title: "Modify Group",
                description: "Modify Group",
                cancelLabel: "Cancel",
                actionLabel: "Modify",
                onAction: (group: Group) => {props.modifyGroupHandler?.(group) },
                onCancel: () => { },
                group: group
              });
            }}>
              <Pencil/>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Modify group</p>
          </TooltipContent>
        </Tooltip>
        <GroupDelete deleteGroupHandler={deleteGroupHandler} uuid={props.group.uuid}/>
      </>
  );
}
