import {useAppConfigStore, useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";

import {Card, CardAction, CardContent, CardHeader, CardTitle,} from "@/shared/ui/kit/card"
import type {AppConfig} from "@/shared/model/types.ts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/shared/ui/kit/table.tsx";
import {AppConfigModify} from "@/features/settings/app-config-modify.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import useAppConfigModifyStore from "@/shared/storage/appConfig-modify-store.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";

export function AppConfigSettings() {
  const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
  const appConfigSave = useAppConfigStore((state) => state.saveAppConfig.trigger);
  const {openAppConfigModify} = useAppConfigModifyStore();
  const { t } = useI18n();

  function modifyApp(appConfig: AppConfig) {
    appConfigSave(appConfig);
  }

  return (
      <>
        <AppConfigModify/>
        <div className="flex justify-center pt-5" >
          <Card className="w-3/4">
            <CardHeader>
              <CardTitle>{t("settings.appConfig.title")}</CardTitle>
              <CardAction>
                <Button variant="outline" onClick={() => {
                  openAppConfigModify({
                    title: t("settings.appConfig.modifyTitle"),
                    description: t("settings.appConfig.modifyDesc"),
                    cancelLabel: t("common.cancel"),
                    actionLabel: t("common.modify"),
                    onAction: (appConfig: AppConfig) => {modifyApp(appConfig) },
                    onCancel: () => { },
                    appConfig: appConfig
                  });
                }}
                >{t("settings.appConfig.modify")}</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("settings.appConfig.value")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      <TableRow>
                        <TableCell>daysForCleanRssItems</TableCell>
                        <TableCell>{appConfig.appConfigPayload?.daysForCleanRssItems}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>daysForSetRead</TableCell>
                        <TableCell>{appConfig.appConfigPayload?.daysForSetRead}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>isSetClickedRssToRead</TableCell>
                        <TableCell>{appConfig.appConfigPayload?.isSetClickedRssToRead ? t("common.yes") : t("common.no")}</TableCell>
                      </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </>
  )
}
