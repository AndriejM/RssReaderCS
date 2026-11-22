import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import {CircleX} from "lucide-react";
import useConfirmationStore from "@/shared/storage/confirmation-store.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";

export type RssDeleteProps = {
  uuid: string;
  deleteRssHandler: (uuid: string) => void;
}

export function RssDelete(props: RssDeleteProps) {
  const { openConfirmation } = useConfirmationStore();
  const { t } = useI18n();

  const deleteRssHandler = (uuid: string) => {
    props.deleteRssHandler(uuid);
  }

  return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label={t("group.removeRss")}
                    onClick={() => {
                      openConfirmation({
                        title: t("group.deleteRssTitle"),
                        description: t("group.deleteRssDesc"),
                        cancelLabel: t("common.cancel"),
                        actionLabel: t("common.delete"),
                        onAction: () => {deleteRssHandler(props.uuid) },
                        onCancel: () => { },
                      });
                    }}>
              <CircleX/>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("group.removeRss")}</p>
          </TooltipContent>
        </Tooltip>
      </>
  )
}