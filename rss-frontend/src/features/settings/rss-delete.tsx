import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import {CircleX} from "lucide-react";
import useConfirmationStore from "@/shared/storage/confirmation-store.ts";

export type RssDeleteProps = {
  uuid: string;
  deleteRssHandler: (uuid: string) => void;
}

export function RssDelete(props: RssDeleteProps) {
  const { openConfirmation } = useConfirmationStore();

  const deleteRssHandler = (uuid: string) => {
    props.deleteRssHandler(uuid);
  }

  return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Submit"
                    onClick={() => {
                      openConfirmation({
                        title: "Delete RSS config! Are you absolutely sure?",
                        description: "This action cannot be undone. This will permanently delete rss config and remove data from our servers!",
                        cancelLabel: "Cancel",
                        actionLabel: "Delete",
                        onAction: () => {deleteRssHandler(props.uuid) },
                        onCancel: () => { },
                      });
                    }}>
              <CircleX/>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Remove RSS config</p>
          </TooltipContent>
        </Tooltip>
      </>
  )
}