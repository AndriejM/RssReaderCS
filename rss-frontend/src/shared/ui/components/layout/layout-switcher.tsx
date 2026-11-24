import {Columns2, Columns3, PanelLeft} from "lucide-react";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {useSettingsStore, useSettingsStoreAsync} from "@/shared/storage/settings-store.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";
import {LAYOUTS, resolveLayout, type Layout} from "@/shared/model/layout.ts";

const LAYOUT_ICONS = {
    three: Columns3,
    outlook: PanelLeft,
    split: Columns2,
} as const;

export function LayoutSwitcher() {
    const settings = useSettingsStoreAsync((state) => state.getUserSettings);
    const saveSettings = useSettingsStore((state) => state.saveUserSettings.trigger);
    const {t} = useI18n();

    const layout = resolveLayout(settings?.layout);

    function changeLayout(next: Layout) {
        if (!settings) {
            return;
        }
        void saveSettings({...settings, layout: next});
    }

    return (
        <div className="flex items-center gap-1">
            {LAYOUTS.map((option) => {
                const Icon = LAYOUT_ICONS[option];
                return (
                    <Tooltip key={option}>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon-sm"
                                variant={layout === option ? "secondary" : "outline"}
                                aria-label={t(`layout.${option}`)}
                                aria-pressed={layout === option}
                                onClick={() => changeLayout(option)}
                            >
                                <Icon/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t(`layout.${option}`)}</p>
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}
