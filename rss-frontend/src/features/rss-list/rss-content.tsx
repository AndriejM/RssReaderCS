import { useEffect, useMemo, useState } from "react";
import { getRssById } from "@/shared/api/api.ts";
import type { RssItem } from "@/shared/model/types.ts";
import parse from "html-react-parser";
import DOMPurify from "dompurify";
import { Button } from "@/shared/ui/kit/button.tsx";

export type RssContentProps = {
    rssId: number | null
}

export function RssContent(props: RssContentProps) {
    const [rss, setRss] = useState<RssItem | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (props.rssId === null) {
            return;
        }
        let cancelled = false;
        setRss(null);
        setError(null);
        setIsLoading(true);
        getRssById(props.rssId)
            .then((result) => {
                if (!cancelled) {
                    setRss(result);
                    setIsLoading(false);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to load RSS");
                    setIsLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [props.rssId]);

    const description = useMemo(
        () => parse(DOMPurify.sanitize(rss?.itemPayload?.description || "")),
        [rss]
    );

    if (props.rssId === null) {
        return <div>No RSS selected</div>;
    }

    return (
        <>
            <div>
                {isLoading ? (
                    <span>Loading…</span>
                ) : rss && rss.link ? (
                    <RssLink link={rss.link} />
                ) : (
                    <span>Link not available</span>
                )}
            </div>
            <div>
                {error && <div>Error: {error}</div>}
                {isLoading ? (
                    <span>Loading…</span>
                ) : rss ? (
                    description
                ) : (
                    <span>No description available</span>
                )}
            </div>
        </>
    );
}

function RssLink({ link }: { link: string }) {
    return (
        <Button variant="link" asChild>
            <a href={link} target="_blank" rel="noopener noreferrer">
                {link}
            </a>
        </Button>
    );
}