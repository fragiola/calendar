import type { NowPosition } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "../hooks/internal";

/**
 * The current time's place in the time grid (`nowIndicator()`, ticked by the engine's clock):
 * today's date, the time and its fraction of a column; `null` when not in view, and before the
 * engine (a server render has no "now" of the screen's).
 */
export function useNowPosition(): NowPosition | null {
    const context = useCalendarContext("useNowPosition");
    const { engine } = context;
    return useCalendarValue(context, () => engine?.get("now-position") ?? null);
}
