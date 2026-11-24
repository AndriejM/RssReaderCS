import { Moon, Sun } from "lucide-react"

import { Button } from "@/shared/ui/kit/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/kit/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/kit/tooltip"
import { useTheme } from "@/shared/ui/components/theme/theme-context"
import { useI18n } from "@/shared/i18n/use-i18n.ts"

export function ModeToggle() {
  const { setTheme } = useTheme()
  const { t } = useI18n()

  return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                <span className="sr-only">{t("theme.toggle")}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("theme.toggle")}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            {t("theme.light")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            {t("theme.dark")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            {t("theme.system")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  )
}