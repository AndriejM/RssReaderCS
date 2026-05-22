import {useRssListAllStore, useRssListAllStoreAsync} from "@/shared/storage/rss-list-all-store.ts";
import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import {useEffect, useState} from "react";
import {Button} from "@/shared/ui/kit/button.tsx";
import {RssContent} from "@/features/rss-list/rss-content.tsx";

function RssListPage() {
  const rssList = useRssListAllStoreAsync((state) => state.getRssList);
  const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
  const updateUserId = useRssListAllStore((state) => state.updateUserId);

  const [rssId, setRssId] = useState<number>(0);

  useEffect(() => {
    updateUserId(appConfig.appConfigPayload.defaultUserId);
  }, []);

  return (
      <>
        <div>RssListPage list count {rssList.length}</div>
        <div className="flex h-screen">
          <div className="sticky top-0 w-200 p-4 overflow-y-auto">
            {
              rssList.map((rss) => (
                  <p>
                  <Button variant={"link"} key={rss.id} onClick={() =>setRssId(rss.id)}>{rss.title}</Button>
                  </p>
              ))
            }
          </div>
          <div className="grow overflow-y-auto p-4">
            <RssContent rssId={rssId} />
          </div>
        </div>
      </>
  );
}

export const Component = RssListPage;