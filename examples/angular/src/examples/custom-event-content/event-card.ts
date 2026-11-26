import { Component, computed } from "@angular/core";
import { injectCalendar, injectTimeEvent } from "@fragiola/calendar-angular";
import {
    LucideBan,
    LucideCrosshair,
    LucideMapPin,
    LucideUsers,
    LucideVideo,
} from "@lucide/angular";
import { timesOf } from "../_kit/format";
import { cancelled, type Types } from "./kinds";
import * as styles from "./styles";

// The event's content, from its kind and data: an icon, the title, the times, the room or the
// call's link, the attendees' initials; a cancelled event says so in its name too. On the event's
// element (`<div [calendarTimeEvent]="segment" customEventContentCard>`): the element is the
// calendar's part, its name, kind and look are the card's.
@Component({
    selector: "[customEventContentCard]",
    imports: [
        LucideBan,
        LucideCrosshair,
        LucideMapPin,
        LucideUsers,
        LucideVideo,
    ],
    host: {
        "[attr.aria-label]": "label()",
        "[attr.data-kind]": "event()?.kind",
        "[class]": "classes()",
    },
    template: `
        @if (event(); as event) {
            <span [class]="styles.eventBox">
                <span [class]="styles.eventHead">
                    @if (isCancelled()) {
                        <svg lucideBan aria-hidden="true" [class]="styles.kindIcon"></svg>
                    } @else {
                        @switch (event.kind) {
                            @case ("meeting") {
                                <svg lucideUsers aria-hidden="true" [class]="styles.kindIcon"></svg>
                            }
                            @case ("call") {
                                <svg lucideVideo aria-hidden="true" [class]="styles.kindIcon"></svg>
                            }
                            @default {
                                <svg lucideCrosshair aria-hidden="true" [class]="styles.kindIcon"></svg>
                            }
                        }
                    }
                    <span data-title [class]="styles.eventTitle">{{ event.title }}</span>
                </span>
                <span [class]="styles.eventTime">{{ times() }}</span>
                @if (event.kind === "meeting") {
                    <span [class]="styles.eventDetail">
                        <svg lucideMapPin aria-hidden="true" [class]="styles.detailIcon"></svg>{{ event.data?.room }}
                    </span>
                }
                @if (event.kind === "call") {
                    <span [class]="styles.eventDetail">
                        <svg lucideVideo aria-hidden="true" [class]="styles.detailIcon"></svg>{{ event.data?.link }}
                    </span>
                }
                @if (people().length > 0) {
                    <span [class]="styles.attendees">
                        @for (person of people(); track person) {
                            <span [title]="person" [class]="styles.attendee">{{ person.slice(0, 1) }}</span>
                        }
                    </span>
                }
            </span>
        }
    `,
})
export class EventCard {
    protected readonly styles = styles;
    private readonly part = injectTimeEvent();
    private readonly model = injectCalendar<Types>().model;
    // the segment is a new object whenever its event changes (D11), so this re-reads the model then
    protected readonly event = computed(() => {
        const segment = this.part.state()?.segment;
        return segment
            ? this.model().get("event-by", { id: segment.eventId })
            : undefined;
    });
    protected readonly isCancelled = computed(() => cancelled(this.event()));
    // `kind` narrows `data`: a meeting and a call have attendees, a focus block none
    protected readonly people = computed(() => {
        const event = this.event();
        return event?.kind === "meeting" || event?.kind === "call"
            ? (event.data?.attendees ?? [])
            : [];
    });
    protected readonly label = computed(() => {
        const event = this.event();
        return event
            ? `${event.title}${this.isCancelled() ? " (cancelled)" : ""}`
            : null;
    });
    protected readonly classes = computed(() => {
        const state = this.part.state();
        return state
            ? styles.event({ ...state, cancelled: this.isCancelled() })
            : "";
    });

    protected times(): string {
        const state = this.part.state();
        return state ? timesOf(this.model(), state.occurrenceId) : "";
    }
}
