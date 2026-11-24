import {useState} from "react";
import {Rss} from "lucide-react";
import {cn} from "@/shared/lib/css.ts";

export type FeedIconProps = {
    src?: string | null
    name?: string | null
    className?: string
}

export function FeedIcon({src, name, className}: FeedIconProps) {
    const [failed, setFailed] = useState(false);
    const base = cn("h-4 w-4 shrink-0", className);

    if (src && !failed) {
        return (
            <img
                src={src}
                alt=""
                loading="lazy"
                onError={() => setFailed(true)}
                className={cn(base, "rounded-sm object-contain")}
            />
        );
    }

    const initial = (name ?? "").trim().charAt(0).toUpperCase();
    if (initial) {
        return (
            <span
                aria-hidden="true"
                className={cn(base, "flex items-center justify-center rounded-sm bg-muted text-[9px] font-semibold text-muted-foreground")}
            >
                {initial}
            </span>
        );
    }

    return <Rss aria-hidden="true" className={cn(base, "text-muted-foreground")}/>;
}
