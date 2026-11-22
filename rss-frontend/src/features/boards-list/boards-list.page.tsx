import {Button} from "@/shared/ui/kit/button.tsx";
import type {AppConfig} from "@/shared/model/types.ts";
import {useAppConfigStore, useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";

function BoardsListPage() {

  const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
  console.log("appConfig:" + JSON.stringify(appConfig));

  const saveAppConfig = useAppConfigStore((state) => state.saveAppConfig.trigger);
  const setCurrentUser = useAppConfigStore((state) => state.setCurrentUser.trigger);

  const handleSave = () => {
    if (!appConfig) return;
    const newAppConfig: AppConfig = {
      ...appConfig,
      appConfigPayload: {
        ...appConfig.appConfigPayload,
        daysForSetRead: 1,
      },
    };
    saveAppConfig(newAppConfig);
  };

  const handleSetCurrent = () => {
    setCurrentUser(1);
  };
  return (
    <div>
      <h1>Boards list</h1>
      <Button onClick={() => handleSave()}>Save button</Button>
      <Button onClick={() => handleSetCurrent()}>Set button</Button>
    </div>
  );
}

export const Component = BoardsListPage;
