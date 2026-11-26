import type { DragPreview } from "@fragiola/calendar";
import type { ComputedRef } from "vue";
import { useCalendarValue } from "../composables/internal";
import { useCalendarContext } from "../context";

/**
 * The occurrence being dragged (`dragAndDrop()`, an outside drag with `externalDrop()`) or
 * resized (`resize()`) where it would land, a computed: its times and its segments in the
 * layout's shape; `null` for none (or a refused target).
 */
export function useDragPreview(): ComputedRef<DragPreview | null> {
    const context = useCalendarContext("useDragPreview");
    return useCalendarValue(context, () => {
        const engine = context.engine.value;
        return (
            engine?.get("drag-preview") ?? engine?.get("resize-preview") ?? null
        );
    });
}
