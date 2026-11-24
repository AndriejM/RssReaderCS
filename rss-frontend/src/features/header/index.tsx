import {ModeToggle} from "@/shared/ui/components/theme/mode-toggle.tsx";
import {UserSelector} from "@/features/header/user-selector.tsx";
import {LayoutSwitcher} from "@/shared/ui/components/layout/layout-switcher.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
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
        <div className="flex items-center justify-between">
          <div className="flex p-2 justify-start gap-3">
            <Link to="/">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" aria-label={t("nav.reader")}>
                    <Rss />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("nav.reader")}</p>
                </TooltipContent>
              </Tooltip>
            </Link>
            <Link to="/settings">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" aria-label={t("settings.title")}>
                    <SettingsIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("settings.title")}</p>
                </TooltipContent>
              </Tooltip>
            </Link>
            {isReader && <LayoutSwitcher />}
          </div>
          <div className="flex p-2 justify-end gap-3">
            <div><UserSelector/></div>
            <div><ModeToggle/></div>
          </div>
        </div>
      </>
  );
}

