import {ModeToggle} from "@/shared/ui/components/theme/mode-toggle.tsx";
import {UserSelector} from "@/features/header/user-selector.tsx";
import {UserCreator} from "@/features/header/user-creator.tsx";
import {UserConfig} from "@/features/header/user-config.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Rss, SettingsIcon} from "lucide-react";
import {Link} from "react-router-dom";

export function AppHeader() {

  return (
      <>
        <div className="grid grid-cols-8 gap-4">
          <div className="flex p-2 justify-start gap-3">
            <Link to="/">
              <Button variant="outline" size="icon" aria-label="Submit">
                <Rss />
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline" size="icon" aria-label="Submit">
                <SettingsIcon />
              </Button>
            </Link>
          </div>
          <div className="col-span-5"><UserConfig/></div>
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

