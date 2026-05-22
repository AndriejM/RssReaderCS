import {useEffect, useState} from "react";
import {getRssById} from "@/shared/api/api.ts";
import type {RssItem} from "@/shared/model/types.ts";
import parse from 'html-react-parser'
import {Button} from "@/shared/ui/kit/button.tsx";

export type RssContentProps = {
  rssId: number | null
}

export function RssContent(props: RssContentProps) {
  const [rss, setRss] = useState<RssItem>();

  useEffect(() => {
    getRssById(props.rssId).then((result) => setRss(result))
  }, [props.rssId]);

  return (
      <>
        <div>Rss Id: {props.rssId} Rss Link: <Button variant={"link"}>
          <a href={rss?.link} target="_blank">{rss?.link}</a>
        </Button>
        </div>
        <div>{parse(rss?.itemPayload?.description || '')}</div>
      </>
  )
}