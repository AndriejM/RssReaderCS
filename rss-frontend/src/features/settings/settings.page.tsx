import {UserConfigSettings} from '@/features/settings/user-config-settings'
import {UserSettings} from '@/features/settings/user-settings.tsx'
import {FeedsSettings} from "@/features/settings/feeds-settings.tsx";
import {AppConfigSettings} from "@/features/settings/app-config-settings.tsx";

function SettingsPage() {
  return (
      <>
        <UserSettings/>
        <UserConfigSettings/>
        <FeedsSettings/>
        <AppConfigSettings/>
      </>
  )
}

export const Component = SettingsPage;