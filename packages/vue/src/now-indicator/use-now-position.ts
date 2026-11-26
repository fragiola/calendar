import type { NowPosition } from "@fragiola/calendar";
import type { ComputedRef } from "vue";
import { useCalendarValue } from "../composables/internal";
import { useCalendarContext } from "../context";

/**
 * The current time's place in the time grid (`nowIndicator()`, ticked by the engine's clock), a
 * computed: today's date, the time and its fraction of a column; `null` when not in view, and
 * before the engine (a server render has no "now" of the screen's).
 */
export function useNowPosition(): ComputedRef<NowPosition | null> {
    const context = useCalendarContext("useNowPosition");
    return useCalendarValue(
        context,
        () => context.engine.value?.get("now-position") ?? null,
    );
}
