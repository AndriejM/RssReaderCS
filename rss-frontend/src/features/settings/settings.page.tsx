import {UserConfigSettings} from '@/features/settings/user-config-settings'
import {AppConfigSettings} from "@/features/settings/app-config-settings.tsx";
import AccordionFilledDemo from "@/components/shadcn-studio/accordion/accordion-14.tsx";

function SettingsPage() {
  return (
      <>
        <UserConfigSettings/>
        <div></div>
        <AppConfigSettings/>
      </>
  )
}

export const Component = SettingsPage;