import {useEffect, useMemo, Suspense} from "react";
import {ErrorBoundary} from 'react-error-boundary';
import parse from "html-react-parser";
import DOMPurify from "dompurify";
import {CheckCheck, CircleDot, FileText, Trash2} from "lucide-react";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {useRssContentStore, useRssContentStoreAsync} from "@/shared/storage/rss-content-store.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";
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
    const {t} = useI18n();
    const updateRssId = useRssContentStore((state) => state.updateRssId);
    const rss = useRssContentStoreAsync((state) => state.rss);

    useEffect(() => {
        updateRssId(props.rssId);
    }, [props.rssId, updateRssId]);

    const display = rss ?? props.item;
    const isRead = display?.status === 'READ';

    const description = useMemo(
        () => parse(DOMPurify.sanitize(display?.itemPayload?.description || display?.description || "")),
        [display]
    );

    if (props.rssId === null) {
        return <div>{t("reader.noRss")}</div>;
    }

    return (
        <>
            <ErrorBoundary fallback={<div>{t("reader.errorLoading")}</div>}>
                <Suspense fallback={<div>{t("common.loading")}</div>}>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {display && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="icon-sm" variant="outline" aria-label={t("reader.fullText")} onClick={() => props.onFullText(display)}>
                                            <FileText/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t("reader.fullText")}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {display && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon-sm"
                                            variant="outline"
                                            aria-label={isRead ? t("reader.markUnread") : t("reader.markRead")}
                                            onClick={() => isRead ? props.onMarkUnread(display) : props.onMarkRead(display)}
                                        >
                                            {isRead ? <CircleDot/> : <CheckCheck/>}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isRead ? t("reader.markUnread") : t("reader.markRead")}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {display && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="icon-sm" variant="destructive" aria-label={t("common.delete")} onClick={() => props.onDelete(display)}>
                                            <Trash2/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t("common.delete")}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                        <div>
                            {display?.link ? (
                                <RssLink link={display.link}/>
                            ) : (
                                <span>{t("reader.linkNotAvailable")}</span>
                            )}
                        </div>
                        {props.fullTextLoading && <div>{t("reader.loadingFullText")}</div>}
                        {props.fullTextError && <div className="text-destructive">{props.fullTextError}</div>}
                        {props.fullText && (
                            <div className="space-y-2">
                                <div className="whitespace-pre-wrap">{props.fullText.text}</div>
                                {props.fullText.truncated && (
                                    <p className="text-xs text-muted-foreground">{t("reader.fullTextTruncated")}</p>
                                )}
                            </div>
                        )}
                        <div>
                            {display ? (
                                description
                            ) : (
                                <span>{t("reader.noDescription")}</span>
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
