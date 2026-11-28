import type { Signal } from "@angular/core";
import type { DragPreview } from "@fragiola/calendar";
import {
    type AnyCalendarEngine,
    calendarValue,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";

/** @internal the engine's drag or resize preview (null: none, or no engine) */
export function previewOf(
    engine: AnyCalendarEngine | null,
): DragPreview | null {
    return engine?.get("drag-preview") ?? engine?.get("resize-preview") ?? null;
}

/**
 * The occurrence being dragged (`dragAndDrop()`, an outside drag with `externalDrop()`) or
 * resized (`resize()`) where it would land: its times and its segments in the layout's shape;
 * `null` for none (or a refused target).
 */
export function injectDragPreview(): Signal<DragPreview | null> {
    const context = injectCalendarContext("injectDragPreview");
    return calendarValue(context, () => previewOf(context.engine()), {
        part: "drag-preview",
    });
}
