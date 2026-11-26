// `@fragiola/calendar/now-indicator`: the `nowIndicator()` feature (D2, D16). The current time's
// place in the time grid (`engine.get("now-position")`: today's column and a fraction of it), from
// the model's clock in the display zone, refreshed every `interval` (default a minute, on the
// interval's boundaries) through the engine host's timer, never a global one. The adapter renders
// the line (`data-calendar-part="now-indicator"`, with `data-date` and `data-time`).
import type { NowPosition } from "../engine/verbs";
import { defineFeature } from "../features/define-feature";
import type { FeatureEngineHost } from "../features/engine-types";
import type { CalendarFeature } from "../features/types";
import type { TimeGrid } from "../layout/time-grid";
import { formatPlainDate } from "../time/format-plain-date";
import { formatPlainTime } from "../time/format-plain-time";
import { instant } from "../time/instant";
import { parsePlainTime } from "../time/parse-plain-time";
import { instantToWallClock } from "../time-zone/instant-to-wall-clock";

export type { NowPosition } from "../engine/verbs";

/** Options of {@link nowIndicator}. */
export interface NowIndicatorOptions {
    /** how often the position moves, in milliseconds; default 60 000 (a minute) */
    interval?: number | undefined;
}

/** The now indicator feature, as `createCalendarModel`'s `features` takes it. */
export type NowIndicatorFeature = CalendarFeature<"now-indicator">;

function minutesOf(value: string, fallback: number): number {
    const time = parsePlainTime(value);
    return time.ok ? time.value.hour * 60 + time.value.minute : fallback;
}

/** The current time's place in the view's time grid, or `null` when it does not show it. */
function nowPosition(host: FeatureEngineHost): NowPosition | null {
    const grid = host.model.get("time-grid") as TimeGrid | null;
    if (!grid) return null;
    const wall = instantToWallClock(
        instant(Math.floor(host.now())),
        host.timeZone(),
    );
    const date = formatPlainDate(wall);
    if (!grid.columns.some((column) => column.date === date)) return null;
    const settings = host.settings();
    const min = minutesOf(settings.slotMinTime, 0);
    const max = minutesOf(settings.slotMaxTime, 1440);
    const minutes = wall.hour * 60 + wall.minute + wall.second / 60;
    if (minutes < min || minutes >= max) return null;
    return Object.freeze({
        date,
        time: formatPlainTime({ hour: wall.hour, minute: wall.minute }),
        top: (minutes - min) / (max - min),
    });
}

/** The current time's line in the time grid, moved by the engine's clock. */
export function nowIndicator(
    options: NowIndicatorOptions = {},
): NowIndicatorFeature {
    const interval = Math.max(options.interval ?? 60_000, 1000);
    return defineFeature({
        name: "now-indicator",
        engine: (host) => {
            let timer: number | undefined;
            const stop = () => {
                host.clearTimeout(timer);
                timer = undefined;
            };
            const schedule = () => {
                stop();
                // the next boundary of the interval: a minute's line moves on the minute
                const delay = interval - (Math.floor(host.now()) % interval);
                timer = host.setTimeout(() => {
                    timer = undefined;
                    host.changed();
                    schedule();
                }, delay);
            };
            schedule();
            return {
                get: { "now-position": () => nowPosition(host) },
                attributes: (part, _payload, into) => {
                    if (part !== "now-indicator") return;
                    const position = nowPosition(host);
                    into["data-date"] = position?.date;
                    into["data-time"] = position?.time;
                },
                attached: schedule,
                detached: () => {
                    stop();
                    // an injected host's timers go on without a root
                    schedule();
                },
                destroy: stop,
            };
        },
    });
}
