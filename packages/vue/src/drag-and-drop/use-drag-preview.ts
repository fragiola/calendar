import type { DragPreview } from "@fragiola/calendar";
import type { ComputedRef } from "vue";
import { useCalendarValue } from "../composables/internal";
import { type AnyCalendarEngine, useCalendarContext } from "../context";

/** @internal the engine's drag or resize preview (null: none, or no engine) */
export function previewOf(
    engine: AnyCalendarEngine | null,
): DragPreview | null {
    return engine?.get("drag-preview") ?? engine?.get("resize-preview") ?? null;
}

/**
 * The occurrence being dragged (`dragAndDrop()`, an outside drag with `externalDrop()`) or
 * resized (`resize()`) where it would land, a computed: its times and its segments in the
 * layout's shape; `null` for none (or a refused target).
 */
export function useDragPreview(): ComputedRef<DragPreview | null> {
    const context = useCalendarContext("useDragPreview");
    return useCalendarValue(context, () => previewOf(context.engine.value), {
        part: "drag-preview",
    });
}
