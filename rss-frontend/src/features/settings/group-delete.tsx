import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Trash} from "lucide-react";
import useConfirmationStore from "@/shared/storage/confirmation-store.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";

export type GroupDeleteProps = {
  uuid: string;
  deleteGroupHandler: (uuid: string) => void;
}

export function GroupDelete(props: GroupDeleteProps) {
  const { openConfirmation } = useConfirmationStore();
  const { t } = useI18n();

  const deleteGroupHandler = (uuid: string) => {
    props.deleteGroupHandler(uuid);
  }

  return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label={t("group.removeGroup")}
                    onClick={() => {
                      openConfirmation({
                        title: t("group.deleteTitle"),
                        description: t("group.deleteDesc"),
                        cancelLabel: t("common.cancel"),
                        actionLabel: t("common.delete"),
                        onAction: () => {deleteGroupHandler(props.uuid) },
                        onCancel: () => { },
                      });
                    }}>
              <Trash/>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("group.removeGroup")}</p>
          </TooltipContent>
        </Tooltip>
      </>
  )
}