import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Trash} from "lucide-react";
import useConfirmationStore from "@/shared/storage/confirmation-store.ts";

export type GroupDeleteProps = {
  uuid: string;
  deleteGroupHandler: (uuid: string) => void;
}

export function GroupDelete(props: GroupDeleteProps) {
  const { openConfirmation } = useConfirmationStore();

  const deleteGroupHandler = (uuid: string) => {
    props.deleteGroupHandler(uuid);
  }

  return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Submit"
                    onClick={() => {
                      openConfirmation({
                        title: "Delete group! Are you absolutely sure?",
                        description: "This action cannot be undone. This will permanently delete group and remove data from our servers!",
                        cancelLabel: "Cancel",
                        actionLabel: "Delete",
                        onAction: () => {deleteGroupHandler(props.uuid) },
                        onCancel: () => { },
                      });
                    }}>
              <Trash/>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Remove group</p>
          </TooltipContent>
        </Tooltip>
      </>
  )
}