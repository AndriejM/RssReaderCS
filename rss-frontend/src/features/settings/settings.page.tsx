import {UserConfigSettings} from '@/features/settings/user-config-settings'
import {FeedsSettings} from "@/features/settings/feeds-settings.tsx";
import {AppConfigSettings} from "@/features/settings/app-config-settings.tsx";

function SettingsPage() {
  return (
      <>
        <UserConfigSettings/>
        <FeedsSettings/>
        <AppConfigSettings/>
      </>
  )
}

export const Component = SettingsPage;