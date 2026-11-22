import {useEffect, useMemo, Suspense} from "react";
import {ErrorBoundary} from 'react-error-boundary';
import parse from "html-react-parser";
import DOMPurify from "dompurify";
import {Button} from "@/shared/ui/kit/button.tsx";
import {useRssContentStore, useRssContentStoreAsync} from "@/shared/storage/rss-content-store.ts";
import type {RssFullText, RssItem} from "@/shared/model/types.ts";

export type RssContentProps = {
    rssId: number | null
    item: RssItem | null
    fullText: RssFullText | null
    fullTextLoading: boolean
    fullTextError: string | null
    onFullText: (item: RssItem) => void
    onMarkRead: (item: RssItem) => void
    onMarkUnread: (item: RssItem) => void
    onDelete: (item: RssItem) => void
}

export function RssContent(props: RssContentProps) {
    const updateRssId = useRssContentStore((state) => state.updateRssId);
    const rss = useRssContentStoreAsync((state) => state.rss);

    useEffect(() => {
        updateRssId(props.rssId);
    }, [props.rssId, updateRssId]);

    const display = rss ?? props.item;

    const description = useMemo(
        () => parse(DOMPurify.sanitize(display?.itemPayload?.description || display?.description || "")),
        [display]
    );

    if (props.rssId === null) {
        return <div>No RSS selected</div>;
    }

    return (
        <>
            <ErrorBoundary fallback={<div>Error loading ...</div>}>
                <Suspense fallback={<div>Loading...</div>}>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {display && (
                                <Button size="sm" variant="outline" onClick={() => props.onFullText(display)}>
                                    Full text
                                </Button>
                            )}
                            {display && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => display.status === 'READ' ? props.onMarkUnread(display) : props.onMarkRead(display)}
                                >
                                    {display.status === 'READ' ? 'Mark unread' : 'Mark read'}
                                </Button>
                            )}
                            {display && (
                                <Button size="sm" variant="destructive" onClick={() => props.onDelete(display)}>
                                    Delete
                                </Button>
                            )}
                        </div>
                        <div>
                            {display?.link ? (
                                <RssLink link={display.link}/>
                            ) : (
                                <span>Link not available</span>
                            )}
                        </div>
                        {props.fullTextLoading && <div>Loading full text...</div>}
                        {props.fullTextError && <div className="text-destructive">{props.fullTextError}</div>}
                        {props.fullText && (
                            <div className="space-y-2">
                                <div className="whitespace-pre-wrap">{props.fullText.text}</div>
                                {props.fullText.truncated && (
                                    <p className="text-xs text-muted-foreground">Full text was truncated.</p>
                                )}
                            </div>
                        )}
                        <div>
                            {display ? (
                                description
                            ) : (
                                <span>No description available</span>
                            )}
                        </div>
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
