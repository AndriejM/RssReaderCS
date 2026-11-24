import {ModeToggle} from "@/shared/ui/components/theme/mode-toggle.tsx";
import {UserSelector} from "@/features/header/user-selector.tsx";
import {UserCreator} from "@/features/header/user-creator.tsx";
import {LayoutSwitcher} from "@/shared/ui/components/layout/layout-switcher.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Rss, SettingsIcon} from "lucide-react";
import {Link, useLocation} from "react-router-dom";
import {ROUTES} from "@/shared/model/routes.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";

export function AppHeader() {
  const {t} = useI18n();
  const location = useLocation();
  const isReader = location.pathname === ROUTES.RSS_LIST;

  return (
      <>
        <div className="grid grid-cols-8 gap-4">
          <div className="flex p-2 justify-start gap-3">
            <Link to="/">
              <Button variant="outline" size="icon" aria-label={t("nav.reader")}>
                <Rss />
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline" size="icon" aria-label={t("settings.title")}>
                <SettingsIcon />
              </Button>
            </Link>
            {isReader && <LayoutSwitcher />}
          </div>
          <div className="col-span-2">
            <div className="flex p-2 justify-end gap-3">
              <div><UserSelector/></div>
              <div><UserCreator/></div>
              <div><ModeToggle/></div>
            </div>
          </div>
        </div>
      </>
  );
}

