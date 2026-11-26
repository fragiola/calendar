// A fake events server, as app code: the event sources feature says which days to fetch
// (`get("ranges-to-fetch")`); fetching is the app's. This one answers after a delay with a few
// meetings per weekday of the asked range, the same ones for the same days, like a real server.
// Copy this file and change it for your API.
import type { CalendarEventJson } from "@fragiola/calendar-vue";
import { at, type Types } from "./data";

/** How long the fake server takes to answer, in milliseconds. */
export const LATENCY = 600;

const MEETINGS = [
    { title: "Standup", start: "09:00", end: "09:15", calendarId: "ada" },
    {
        title: "Customer call",
        start: "11:00",
        end: "12:00",
        calendarId: "grace",
    },
    { title: "Code review", start: "14:00", end: "15:00", calendarId: "alan" },
    {
        title: "Hiring sync",
        start: "16:00",
        end: "16:30",
        calendarId: "katherine",
    },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** The days from `start` to `end` (exclusive), as `YYYY-MM-DD`. */
function daysOf(start: string, end: string): string[] {
    const days: string[] = [];
    const [y, m, d] = start.split("-").map(Number);
    const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
    for (let guard = 0; guard < 400; guard++) {
        const iso = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
        if (iso >= end) break;
        days.push(iso);
        date.setUTCDate(date.getUTCDate() + 1);
    }
    return days;
}

/** The events of the days from `start` to `end` (exclusive), after {@link LATENCY}. */
export function fetchEvents(
    sourceId: string,
    range: { start: string; end: string },
    signal?: AbortSignal,
): Promise<CalendarEventJson<Types>[]> {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
            const events: CalendarEventJson<Types>[] = [];
            for (const date of daysOf(range.start, range.end)) {
                const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
                if (weekday === 0 || weekday === 6) continue;
                MEETINGS.forEach((meeting, index) => {
                    // not every meeting every day, but always the same ones
                    if ((weekday + index) % 3 === 0) return;
                    events.push({
                        id: `${sourceId}-${date}-${index}`,
                        kind: "meeting",
                        title: meeting.title,
                        start: at(date, meeting.start),
                        end: at(date, meeting.end),
                        allDay: false,
                        calendarId: meeting.calendarId,
                        sourceId,
                    });
                });
            }
            resolve(events);
        }, LATENCY);
        signal?.addEventListener("abort", () => {
            window.clearTimeout(timer);
            reject(signal.reason);
        });
    });
}
