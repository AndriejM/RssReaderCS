import type {Group, RssConfig, UserConfig} from "@/shared/model/types.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/shared/ui/kit/table";
import {userConfigStore, userConfigStoreAsync} from "@/shared/storage/user-config-store.ts";
import {GroupDelete} from "@/features/settings/group-delete.tsx";
import {RssDelete} from "@/features/settings/rss-delete.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Pencil, PlusCircle} from "lucide-react";
import useGroupModifyStore from "@/shared/storage/group-modify-store.ts";
import useRssModifyStore from "@/shared/storage/rss-modify-store.ts";

export type GroupViewProps = {
  group: Group;
  deleteGroupHandler?: (uuid: string) => void | undefined;
  modifyGroupHandler?: (group: Group) => void | undefined;
}

export function GroupView(props: GroupViewProps) {

  const userConfig = userConfigStoreAsync((state) => state.getUserConfig);
  const saveUserConfig = userConfigStore((state) => state.saveUserConfig.trigger);
  const { openGroupModify } = useGroupModifyStore();
  const { openRssModify } = useRssModifyStore();
  const group = props.group;

  function deleteGroupHandler(uuid: string) {
    props.deleteGroupHandler?.(uuid);
  }

  function updateGroup(updatedGroup: Group) {
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
    saveUserConfig(updatedUserConfig);
  }

  function deleteRssHandle(uuid: string) {
    console.log("delete rss config uuid:" + JSON.stringify(uuid));
    updateGroup({
      ...group,
      rssConfigs: group.rssConfigs.filter((obj) => obj.uuid !== uuid),
    });
  }

  function saveRssHandler(rssConfig: RssConfig) {
    console.log("Save" + JSON.stringify(rssConfig));
    updateGroup({
      ...group,
      rssConfigs: group.rssConfigs
        .filter((obj) => obj.uuid !== rssConfig.uuid)
        .concat(rssConfig),
    });
  }

  return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Url</TableHead>
              <TableHead>Refresh Cron</TableHead>
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
            {props.group?.rssConfigs?.map((rssConfig) => (
                <TableRow>
                  <TableCell>{rssConfig.name}</TableCell>
                  <TableCell>{rssConfig.url}</TableCell>
                  <TableCell>{rssConfig.refreshCronExpression}</TableCell>
                  <TableCell>
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
            ))}
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
  )
}