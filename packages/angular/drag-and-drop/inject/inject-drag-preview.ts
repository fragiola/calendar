import type { Signal } from "@angular/core";
import type { DragPreview } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";

/**
 * The occurrence being dragged (`dragAndDrop()`, an outside drag with `externalDrop()`) or
 * resized (`resize()`) where it would land: its times and its segments in the layout's shape;
 * `null` for none (or a refused target).
 */
export function injectDragPreview(): Signal<DragPreview | null> {
    const context = injectCalendarContext("injectDragPreview");
    return calendarValue(context, () => {
        const engine = context.engine();
        return (
            engine?.get("drag-preview") ?? engine?.get("resize-preview") ?? null
        );
    });
}
