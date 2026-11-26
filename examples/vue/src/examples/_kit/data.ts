// The examples' demo content: a small product team's calendars and a believable week around
// today, written as JSON the way a server would send it (all-day dates, RFC 3339 date-times with
// this computer's offset). App code, no calendar assembly: each example renders the calendar
// itself.
import type {
    CalendarEventJson,
    CalendarInfoJson,
} from "@fragiola/calendar-vue";

/** The Fragiola UI palettes the calendars are painted with (one per calendar). */
export type Palette = "blue" | "green" | "orange" | "purple" | "danger";

/** What the examples' calendars hold: each event kind, and a calendar's palette. */
export type Types = {
    events: { meeting: undefined; focus: undefined; trip: undefined };
    calendar: { palette: Palette };
};

/** The team's calendars: one per person, and the company's. */
export const CALENDARS: CalendarInfoJson<Types>[] = [
    { id: "ada", title: "Ada", data: { palette: "blue" } },
    { id: "grace", title: "Grace", data: { palette: "green" } },
    { id: "alan", title: "Alan", data: { palette: "orange" } },
    { id: "katherine", title: "Katherine", data: { palette: "purple" } },
    { id: "company", title: "Company", data: { palette: "danger" } },
];

/** The palette of a calendar, for an event's class (blue when it has none). */
export function paletteOf(calendarId: string | undefined): Palette {
    return (
        CALENDARS.find((calendar) => calendar.id === calendarId)?.data
            .palette ?? "blue"
    );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A local date as `YYYY-MM-DD`. */
function plain(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today plus `days`, as `YYYY-MM-DD` on this computer's calendar. */
export function day(days = 0): string {
    const today = new Date();
    return plain(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() + days),
    );
}

/** The date of a weekday (0 Sunday … 6 Saturday) of this week, plus `weeks` weeks. */
export function weekday(weekdayNumber: number, weeks = 0): string {
    const today = new Date();
    return day(weekdayNumber - today.getDay() + weeks * 7);
}

/** An RFC 3339 date-time at `HH:mm` on a `YYYY-MM-DD` day, with this computer's offset. */
export function at(date: string, time: string): string {
    const [year, month, dayOfMonth] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const local = new Date(
        year ?? 1970,
        (month ?? 1) - 1,
        dayOfMonth ?? 1,
        hours ?? 0,
        minutes ?? 0,
    );
    const offset = -local.getTimezoneOffset();
    const sign = offset < 0 ? "-" : "+";
    const abs = Math.abs(offset);
    return `${date}T${pad(hours ?? 0)}:${pad(minutes ?? 0)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** A timed event on a day, from `HH:mm` to `HH:mm`. */
export function timed(
    id: string,
    title: string,
    date: string,
    start: string,
    end: string,
    calendarId: string,
): CalendarEventJson<Types> {
    return {
        id,
        kind: "meeting",
        title,
        start: at(date, start),
        end: at(date, end),
        allDay: false,
        calendarId,
    };
}

/** An all-day event over `days` days from `date`. */
export function allDay(
    id: string,
    title: string,
    date: string,
    days: number,
    calendarId: string,
): CalendarEventJson<Types> {
    const [year, month, dayOfMonth] = date.split("-").map(Number);
    const end = plain(
        new Date(year ?? 1970, (month ?? 1) - 1, (dayOfMonth ?? 1) + days),
    );
    return {
        id,
        kind: "trip",
        title,
        start: date,
        end,
        allDay: true,
        calendarId,
    };
}

/** The team's week: meetings, focus blocks, a trip and a launch, around today. */
export function teamWeek(): CalendarEventJson<Types>[] {
    return [
        allDay("offsite", "Team offsite", weekday(1), 2, "company"),
        allDay("conference", "Conference in Lisbon", weekday(3), 3, "alan"),
        allDay("launch", "Launch day", weekday(5), 1, "company"),
        timed(
            "planning",
            "Sprint planning",
            weekday(1),
            "10:00",
            "11:30",
            "ada",
        ),
        timed("design", "Design review", weekday(2), "14:00", "15:00", "grace"),
        timed(
            "one-on-one",
            "Ada / Grace 1:1",
            weekday(2),
            "11:00",
            "11:30",
            "ada",
        ),
        timed(
            "interview",
            "Candidate interview",
            weekday(3),
            "09:30",
            "10:30",
            "katherine",
        ),
        timed(
            "focus",
            "Focus: billing API",
            weekday(3),
            "13:00",
            "16:00",
            "alan",
        ),
        timed("lunch", "Team lunch", weekday(4), "12:00", "13:00", "company"),
        timed("demo", "Demo rehearsal", weekday(4), "15:00", "16:00", "grace"),
        timed("retro", "Retrospective", weekday(5), "16:00", "17:00", "ada"),
        timed(
            "support",
            "Support rotation",
            weekday(4),
            "09:00",
            "12:00",
            "katherine",
        ),
        timed("sync", "Partner sync", weekday(4), "10:00", "10:30", "alan"),
        timed(
            "next-planning",
            "Roadmap review",
            weekday(2, 1),
            "10:00",
            "11:00",
            "ada",
        ),
        timed(
            "past-review",
            "Quarterly review",
            weekday(4, -1),
            "14:00",
            "16:00",
            "company",
        ),
    ];
}
