import type { DragPreview } from "@fragiola/calendar";
import { type AnyCalendarEngine, useCalendarContext } from "../context";
import { useCalendarValue } from "../hooks/internal";

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
export function useDragPreview(): DragPreview | null {
    const context = useCalendarContext("useDragPreview");
    return useCalendarValue(context, () => previewOf(context.engine), {
        part: "drag-preview",
    });
}
