import type { CalendarEventOf } from "@fragiola/calendar-vue";
import { Crosshair, type LucideIcon, Users, Video } from "@lucide/vue";
import type { Palette } from "../_kit/data";

// What this calendar's events hold, by kind: `event.data` narrows on `event.kind`, so a meeting
// has a room and attendees, a call its link, a focus block nothing. Every event may be cancelled.
export type Types = {
    events: {
        meeting: { room: string; attendees: string[]; cancelled?: boolean };
        call: { link: string; attendees: string[]; cancelled?: boolean };
        focus: { cancelled?: boolean } | undefined;
    };
    calendar: { palette: Palette };
};

export type EventOf = CalendarEventOf<Types>;

type Kind = keyof Types["events"];

/** Each kind's icon. */
export const ICONS: Record<Kind, LucideIcon> = {
    meeting: Users,
    call: Video,
    focus: Crosshair,
};

/** Whether an event's data says it is cancelled (any kind may be). */
export function cancelled(event: EventOf | undefined): boolean {
    return event?.data?.cancelled === true;
}
