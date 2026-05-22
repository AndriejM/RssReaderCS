import {useUserStoreAsync} from "@/shared/storage/user-store.ts";
import {useAppConfigStore, useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shared/ui/kit/select.tsx";

export function UserSelector() {
  const user = useUserStoreAsync((state) => state.getUser);
  const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
  const setCurrentUser = useAppConfigStore((state) => state.setCurrentUser.trigger);

  function refreshPage(){
    window.location.reload();
  }

  const changeUser = (value: string) => {
    setCurrentUser(parseInt(value, 10)).then(() => refreshPage());
  }

  return (
      <Select defaultValue={appConfig.appConfigPayload.defaultUserId.toString()} onValueChange={changeUser}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Profile"/>
        </SelectTrigger>
        <SelectContent>
          {user.map((u) => {
                return (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.userName}</SelectItem>
                )
              }
          )
          }
        </SelectContent>
      </Select>
  );
}