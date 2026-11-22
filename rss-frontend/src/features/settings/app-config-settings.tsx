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

export function AppConfigSettings() {
  const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
  const appConfigSave = useAppConfigStore((state) => state.saveAppConfig.trigger);
  const {openAppConfigModify} = useAppConfigModifyStore();

  function modifyApp(appConfig: AppConfig) {
    appConfigSave(appConfig);
  }

  return (
      <>
        <AppConfigModify/>
        <div className="flex justify-center pt-5" >
          <Card className="w-3/4">
            <CardHeader>
              <CardTitle>App config</CardTitle>
              <CardAction>
                <Button variant="outline" onClick={() => {
                  openAppConfigModify({
                    title: "Modify App config",
                    description: "Modify App config",
                    cancelLabel: "Cancel",
                    actionLabel: "Modify",
                    onAction: (appConfig: AppConfig) => {modifyApp(appConfig) },
                    onCancel: () => { },
                    appConfig: appConfig
                  });
                }}
                >Modify app config</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
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
                        <TableCell>{appConfig.appConfigPayload?.isSetClickedRssToRead ? "Yes" : "No"}</TableCell>
                      </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </>
  )
}
