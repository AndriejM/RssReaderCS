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
