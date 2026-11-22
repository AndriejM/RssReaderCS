import {useEffect, useMemo, Suspense} from "react";
import {ErrorBoundary} from 'react-error-boundary';
import parse from "html-react-parser";
import DOMPurify from "dompurify";
import {Button} from "@/shared/ui/kit/button.tsx";
import {useRssContentStore, useRssContentStoreAsync} from "@/shared/storage/rss-content-store.ts";

export type RssContentProps = {
    rssId: number | null
}

export function RssContent(props: RssContentProps) {
    const updateRssId = useRssContentStore((state) => state.updateRssId);
    const rss = useRssContentStoreAsync((state) => state.rss);

    useEffect(() => {
        updateRssId(props.rssId);
    }, [props.rssId, updateRssId]);

    const description = useMemo(
        () => parse(DOMPurify.sanitize(rss?.itemPayload?.description || "")),
        [rss]
    );

    if (props.rssId === null) {
        return <div>No RSS selected</div>;
    }

    return (
        <>
            <ErrorBoundary fallback={<div>Error loading ...</div>}>
                <Suspense fallback={<div>Loading...</div>}>
                    <div>
                        {rss && rss.link ? (
                            <RssLink link={rss.link}/>
                        ) : (
                            <span>Link not available</span>
                        )}
                    </div>
                    <div>
                        {rss ? (
                            description
                        ) : (
                            <span>No description available</span>
                        )}
                    </div>
                </Suspense>
            </ErrorBoundary>
        </>
    );
}

function RssLink({link}: { link: string }) {
    return (
        <Button variant="link" asChild>
            <a href={link} target="_blank" rel="noopener noreferrer">
                {link}
            </a>
        </Button>
    );
}