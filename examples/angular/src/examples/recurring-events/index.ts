import {
    afterNextRender,
    Component,
    type ElementRef,
    signal,
    viewChild,
} from "@angular/core";
import {
    CALENDAR,
    createCalendarModel,
    type EditScope,
    veto,
} from "@fragiola/calendar-angular";
import {
    CalendarDragPreviewDirective,
    dragAndDrop,
} from "@fragiola/calendar-angular/drag-and-drop";
import { recurrence } from "@fragiola/calendar-angular/recurrence";
import {
    CalendarResizeHandleDirective,
    resize,
} from "@fragiola/calendar-angular/resize";
import { LucideRepeat } from "@lucide/angular";
import { Button } from "#/components/atoms/clickable";
import { DIALOG } from "#/components/ui/dialog";
import {
    at,
    CALENDARS,
    day,
    type Types,
    teamWeek,
    weekday,
} from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

const FEATURES = [recurrence(), dragAndDrop(), resize()] as const;

/** A move or a resize of an occurrence of a series, waiting for the user's scope. */
interface Pending {
    command: "event.move" | "event.resize";
    payload: Record<string, unknown>;
    title: string;
}

/** The `meta` of a command the user already scoped: the middleware lets it through. */
const SCOPED = { scoped: true } as const;

const SCOPES: { scope: EditScope; label: string }[] = [
    { scope: "this", label: "This event" },
    { scope: "following", label: "This and following events" },
    { scope: "all", label: "All events" },
];

// Recurring events: a weekday standup and a monthly review, RFC 5545 rules expanded over what the
// view shows. A drop or a resize of one occurrence asks which ones it changes (the package never
// asks: here a middleware holds the command, a dialog asks, and the command runs again with the
// scope chosen: `this` overrides the occurrence, `following` splits the series, `all` changes it).
@Component({
    selector: "example-recurring-events",
    imports: [
        Button,
        CALENDAR,
        CalendarDragPreviewDirective,
        CalendarResizeHandleDirective,
        DayHeader,
        DIALOG,
        LucideRepeat,
        Toolbar,
    ],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root">
            <div recurringEventsToolbar [class]="styles.toolbar"></div>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [recurringEventsDayHeader]="date" [class]="styles.header"></div>
                    </ng-template>
                </div>
                <div calendarAllDayRow [class]="styles.allDayRow">
                    <div aria-hidden="true" [class]="styles.allDayLabel">all-day</div>
                    <ng-template calendarDays let-day>
                        <div [calendarDay]="day" [class]="styles.allDayCell">
                            <div calendarDayEvents>
                                <ng-template calendarDayEventsItem let-segment>
                                    <div
                                        [calendarSegment]="segment"
                                        #event="calendarSegment"
                                        [class]="event.state() && styles.segment(event.state()!)"
                                    >
                                        <span [class]="styles.segmentLabel">{{ titleOf(model, segment.occurrenceId, segment.eventId) }}</span>
                                    </div>
                                </ng-template>
                            </div>
                        </div>
                    </ng-template>
                <div *calendarDragPreview [class]="styles.rowPreview"></div>
                </div>
                <div calendarScroller #scroller [class]="styles.scroller">
                    <div [class]="styles.body">
                        <ng-template calendarSlotRows let-slot>
                            <div [calendarSlotRow]="slot" [class]="styles.slotRow">
                                <div calendarSlotLabel [class]="styles.slotLabel">
                                    @if (slot.time.endsWith(":00")) {
                            <span [class]="styles.slotTime">{{ hour(slot.time) }}</span>
                        }
                                </div>
                                <ng-template calendarSlots let-column>
                                    <div [calendarSlot]="column.date" [class]="styles.slot"></div>
                                </ng-template>
                            </div>
                        </ng-template>
                        <div calendarColumns [class]="styles.columns">
                            <ng-template calendarColumnsItem let-column>
                                <div [calendarColumn]="column" [class]="styles.column">
                                    <div calendarColumnEvents>
                                        <ng-template calendarColumnEventsItem let-segment>
                                            <div
                                                [calendarTimeEvent]="segment"
                                                #event="calendarTimeEvent"
                                                [class]="event.state() && styles.event(event.state()!)"
                                            >
                                                <span [class]="styles.eventBox">
                                                    <span [class]="styles.eventTitle">@if (repeats(segment.eventId)) {<svg lucideRepeat role="img" title="Repeats" aria-label="Repeats" [class]="styles.repeat"></svg>}{{ titleOf(model, segment.occurrenceId, segment.eventId) }}</span>
                                                    <span [class]="styles.eventTime">{{ timesOf(model, segment.occurrenceId) }}</span>
                                                </span>
                                                <div *calendarResizeHandle="'end'" [class]="styles.handleEnd"></div>
                                            </div>
                                        </ng-template>
                                    </div>
                        <div *calendarDragPreview [class]="styles.preview"></div>
                                </div>
                            </ng-template>
                        </div>
                    </div>
                </div>
            </div>
            <ng-template kitDialog [open]="pending() !== null" (openChange)="onOpenChange($event)">
                <div kitDialogBackdrop></div>
                <kit-dialog-content>
                    <div kitDialogHeader>
                        <h2 kitDialogTitle>Edit recurring event</h2>
                        <p kitDialogDescription>“{{ pending()?.title ?? "" }}” repeats. Change which events?</p>
                    </div>
                    <div kitDialogBody [class]="styles.scopes">
                        @for (option of SCOPES; track option.scope) {
                            <button kitButton variant="outline" [class]="styles.scope" (click)="choose(option.scope)">{{ option.label }}</button>
                        }
                    </div>
                    <div kitDialogFooter>
                        <button kitButton variant="ghost" kitDialogClose>Cancel</button>
                    </div>
                </kit-dialog-content>
            </ng-template>
        </div>
    `,
})
export default class RecurringEvents {
    protected readonly styles = styles;
    protected readonly SCOPES = SCOPES;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly pending = signal<Pending | null>(null);
    protected readonly model = createCalendarModel<Types, typeof FEATURES>(
        {
            version: 1,
            events: [
                ...teamWeek(),
                {
                    id: "standup",
                    kind: "meeting",
                    title: "Standup",
                    start: at(weekday(1, -1), "09:00"),
                    end: at(weekday(1, -1), "09:30"),
                    allDay: false,
                    calendarId: "ada",
                    recurrence: {
                        rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
                    },
                },
                {
                    id: "review",
                    kind: "meeting",
                    title: "Monthly review",
                    start: at(weekday(5), "13:00"),
                    end: at(weekday(5), "14:00"),
                    allDay: false,
                    calendarId: "company",
                    recurrence: { rule: "FREQ=MONTHLY;COUNT=12" },
                },
            ],
            calendars: CALENDARS,
            view: { type: "week", anchorDate: day() },
        },
        { features: FEATURES },
    );
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        this.model.use((ctx, next) => {
            if (
                ctx.dryRun ||
                ctx.meta?.scoped === true ||
                (ctx.command !== "event.move" && ctx.command !== "event.resize")
            ) {
                return next();
            }
            const { eventId, occurrenceId } = ctx.payload;
            const event = ctx.get("event-by", { id: eventId });
            if (occurrenceId === undefined || event?.recurrence === undefined) {
                return next();
            }
            this.pending.set({
                command: ctx.command,
                payload: { ...ctx.payload },
                title: event.title,
            });
            return veto("waiting for the user's scope");
        });
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement));
    }

    /** A repeat mark on an occurrence of a series (`event-recurring`, the recurrence feature's). */
    protected repeats(eventId: string): boolean {
        return this.model.is("event-recurring", { eventId });
    }

    protected choose(scope: EditScope) {
        const pending = this.pending();
        if (!pending) return;
        this.model.run(
            pending.command,
            { ...pending.payload, scope } as never,
            { meta: SCOPED },
        );
        this.pending.set(null);
    }

    protected onOpenChange(open: boolean) {
        if (!open) this.pending.set(null);
    }

    /** An hour's label, `9 AM` in the calendar's locale. */
    protected hour(time: string): string {
        return text(
            this.model.get("slot-label-by", {
                time,
                format: { hour: "numeric" },
            }) ?? [],
        );
    }
}

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement) {
    const eight = element.querySelector<HTMLElement>('[data-time="08:00"]');
    if (eight) element.scrollTop = eight.offsetTop - 8;
}
