import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import {useEffect} from "react";
import {userConfigStore, userConfigStoreAsync} from "@/shared/storage/user-config-store.ts";
import {useRssListAllStore} from "@/shared/storage/rss-list-all-store.ts";
import {GroupView} from "@/features/settings/group-view.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/kit/accordion"

import {Card, CardAction, CardContent, CardHeader, CardTitle,} from "@/shared/ui/kit/card"
import type {Group, UserConfig} from "@/shared/model/types.ts";
import {toast} from "sonner";
import {GroupModify} from "@/features/settings/group-modify.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import useGroupModifyStore from "@/shared/storage/group-modify-store.ts";
import {RssModify} from "@/features/settings/rss-modify.tsx";
import {useI18n} from "@/shared/i18n/use-i18n.ts";

export function UserConfigSettings() {

  const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
  const userConfig = userConfigStoreAsync((state) => state.getUserConfig);
  const updateUserId = userConfigStore((state) => state.updateUserId);
  const saveUserConfig = userConfigStore((state) => state.saveUserConfig.trigger);
  const { openGroupModify } = useGroupModifyStore();
  const { t } = useI18n();

  const defaultUserId = appConfig?.appConfigPayload?.defaultUserId;

  useEffect(() => {
    if (defaultUserId !== undefined) {
      updateUserId(defaultUserId);
    }
  }, [defaultUserId, updateUserId]);

  async function saveUserConfigWithGroups(groups: Group[]) {
    if (!userConfig) return;
    const updatedUserConfig: UserConfig = {
      ...userConfig,
      userConfigPayload: {
        ...userConfig.userConfigPayload,
        groups,
      },
    };
    await saveUserConfig(updatedUserConfig);
    useRssListAllStore.getState().getRssList.markStale();
  }

  function addGroup(group: Group) {
    if (!userConfig) return;
    console.log("add group:" + group);
    void saveUserConfigWithGroups([...userConfig.userConfigPayload.groups, group]);
  }

  function deleteGroup(uuid: string | undefined) {
    if (!userConfig) return;
    if (userConfig.userConfigPayload.groups.length <= 1) {
      toast.warning(t("settings.groups.lastGroup"), { position: "top-center" });
      return;
    }
    void saveUserConfigWithGroups(
      userConfig.userConfigPayload.groups.filter((obj) => obj.uuid !== uuid)
    );
  }

  function modifyGroup(group: Group) {
    if (!userConfig) return;
    void saveUserConfigWithGroups(
      userConfig.userConfigPayload.groups
        .filter((obj) => obj.uuid !== group.uuid)
        .concat(group)
    );
  }

  return (
      <>
        <GroupModify/>
        <RssModify/>
        <div className="flex justify-center">
          <Card className="w-3/4">
            <CardHeader>
              <CardTitle>{t("settings.groups.title")}</CardTitle>
              <CardAction>
                <Button variant="outline" onClick={() => {
                  openGroupModify({
                    title: t("settings.groups.addTitle"),
                    description: t("settings.groups.addDesc"),
                    cancelLabel: t("common.cancel"),
                    actionLabel: t("common.add"),
                    onAction: (group: Group) => {addGroup(group) },
                    onCancel: () => { },
                    group: undefined
                  });
                }}>{t("settings.groups.addGroup")}</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Accordion type='single' collapsible className='w-full space-y-2' defaultValue='item-1'>
                {userConfig?.userConfigPayload.groups.map((group, index) => (
                    <AccordionItem value={group.uuid} key={index} className='rounded-md border!'>
                      <AccordionTrigger className='bg-accent px-5 data-[state=open]:rounded-b-none'>{group.name}</AccordionTrigger>
                      <AccordionContent>
                        <GroupView group={group} deleteGroupHandler={deleteGroup}
                                   modifyGroupHandler={modifyGroup}/>
                      </AccordionContent>
                    </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </>
  )
}
