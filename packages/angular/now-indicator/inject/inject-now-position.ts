import type { Signal } from "@angular/core";
import type { NowPosition } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";

/**
 * The current time's place in the time grid (`nowIndicator()`, ticked by the engine's clock):
 * today's date, the time and its fraction of a column; `null` when not in view, and before the
 * engine (a server render has no "now" of the screen's).
 */
export function injectNowPosition(): Signal<NowPosition | null> {
    const context = injectCalendarContext("injectNowPosition");
    return calendarValue(
        context,
        () => context.engine()?.get("now-position") ?? null,
    );
}
