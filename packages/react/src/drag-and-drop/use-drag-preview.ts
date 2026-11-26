import type { DragPreview } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "../hooks/internal";

/**
 * The occurrence being dragged (`dragAndDrop()`, an outside drag with `externalDrop()`) or
 * resized (`resize()`) where it would land: its times and its segments in the layout's shape;
 * `null` for none (or a refused target).
 */
export function useDragPreview(): DragPreview | null {
    const context = useCalendarContext("useDragPreview");
    const { engine } = context;
    return useCalendarValue(
        context,
        () =>
            engine?.get("drag-preview") ??
            engine?.get("resize-preview") ??
            null,
    );
}
