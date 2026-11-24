import {useCallback, useRef} from "react";

export function useDragWidth(
    getWidth: () => number,
    minWidth: number,
    onResize: (width: number) => void,
    onCommit: (width: number) => void
): (event: React.PointerEvent) => void {
    const drag = useRef({startX: 0, startWidth: 0});

    return useCallback((event: React.PointerEvent) => {
        event.preventDefault();
        drag.current = {startX: event.clientX, startWidth: getWidth()};

        const clamp = (clientX: number) =>
            Math.max(minWidth, drag.current.startWidth + (clientX - drag.current.startX));

        const onMove = (moveEvent: PointerEvent) => onResize(clamp(moveEvent.clientX));
        const onUp = (upEvent: PointerEvent) => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            onCommit(clamp(upEvent.clientX));
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
    }, [getWidth, minWidth, onResize, onCommit]);
}

export function useDragHeight(
    getHeight: () => number,
    minHeight: number,
    onResize: (height: number) => void,
    onCommit: (height: number) => void
): (event: React.PointerEvent) => void {
    const drag = useRef({startY: 0, startHeight: 0});

    return useCallback((event: React.PointerEvent) => {
        event.preventDefault();
        drag.current = {startY: event.clientY, startHeight: getHeight()};

        const clamp = (clientY: number) =>
            Math.max(minHeight, drag.current.startHeight + (clientY - drag.current.startY));

        const onMove = (moveEvent: PointerEvent) => onResize(clamp(moveEvent.clientY));
        const onUp = (upEvent: PointerEvent) => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            onCommit(clamp(upEvent.clientY));
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
    }, [getHeight, minHeight, onResize, onCommit]);
}
