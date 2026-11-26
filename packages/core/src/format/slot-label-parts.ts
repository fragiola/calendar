// A time grid's slot label as data (D4): the slot's wall-clock time as `Intl.DateTimeFormat`
// parts in the settings' locale (`9:00 AM`), the same on every day (the axis is the wall clock).
import type { FormatOptions } from "../locale/date-time-format";
import { formatTimeParts } from "../locale/format-time-parts";
import type { CalendarState } from "../state/calendar-state";
import { parsePlainTime } from "../time/parse-plain-time";

/** A slot label's parts (`format` replaces `{ hour: "numeric", minute: "2-digit" }`), or `undefined`. */
export function slotLabelParts(
    state: CalendarState,
    time: unknown,
    format: FormatOptions | undefined,
): Intl.DateTimeFormatPart[] | undefined {
    const parsed = parsePlainTime(time);
    if (!parsed.ok || parsed.value.hour === 24) return undefined;
    return formatTimeParts(
        parsed.value,
        state.settings.locale,
        format ?? { hour: "numeric", minute: "2-digit" },
    );
}
