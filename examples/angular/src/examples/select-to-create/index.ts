import {
    afterNextRender,
    Component,
    type ElementRef,
    signal,
    viewChild,
} from "@angular/core";
import {
    CALENDAR,
    type CalendarEngineEventOf,
    createCalendarModel,
} from "@fragiola/calendar-angular";
import {
    CalendarSelectionDirective,
    CalendarSelectionRootDirective,
    selection,
} from "@fragiola/calendar-angular/selection";
import { Button } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { DIALOG } from "#/components/ui/dialog";
import { FIELD_PARTS } from "#/components/ui/field";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { dateTimeFormat, text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

const FEATURES = [selection()] as const;

type Range = CalendarEngineEventOf<"select">["range"];

// Select to create: drag over the slots (or the all-day row), or Shift + arrows then Enter, and
// the selected range opens an editor. Saving runs `event.add` with the range's times; either way
// the selection is cleared. The editor is the app's: the package ships none.
@Component({
    selector: "example-select-to-create",
    imports: [
        Button,
        CALENDAR,
        CalendarSelectionDirective,
        CalendarSelectionRootDirective,
        DayHeader,
        DIALOG,
        FIELD_PARTS,
        Input,
        Toolbar,
    ],
    host: { class: "contents" },
    template: `
        <div
            [calendarRoot]="model"
            calendarSelection
            [class]="styles.root"
            (rangeSelect)="range.set($event.range)"
        >
            <div selectToCreateToolbar [class]="styles.toolbar"></div>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [selectToCreateDayHeader]="date" [class]="styles.header"></div>
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
                <!-- the selected days, over the row -->
                <div *calendarSelection="let selection" [class]="styles.selection(selection)"></div>
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
                                                    <span [class]="styles.eventTitle">{{ titleOf(model, segment.occurrenceId, segment.eventId) }}</span>
                                                    <span [class]="styles.eventTime">{{ timesOf(model, segment.occurrenceId) }}</span>
                                                </span>
                                            </div>
                                        </ng-template>
                                    </div>
                        <!-- the selected range, laid out as an event -->
                        <div *calendarSelection="let selection" [class]="styles.selection(selection)"></div>
                                </div>
                            </ng-template>
                        </div>
                    </div>
                </div>
            </div>
            <ng-template kitDialog [open]="range() !== null" (openChange)="onOpenChange($event)">
                <div kitDialogBackdrop></div>
                <kit-dialog-content>
                    <form (submit)="$event.preventDefault(); save()">
                        <div kitDialogHeader>
                            <h2 kitDialogTitle>New event</h2>
                            <p kitDialogDescription>{{ when(range()) }}</p>
                        </div>
                        <div kitDialogBody>
                            <div kitField>
                                <label kitFieldLabel>Title</label>
                                <div kitFieldRow>
                                    <div kitFieldBody>
                                        <input kitInput [(value)]="title" placeholder="New event" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div kitDialogFooter>
                            <button kitButton variant="outline" kitDialogClose>Cancel</button>
                            <button kitButton type="submit" [class]="styles.primary">Save</button>
                        </div>
                    </form>
                </kit-dialog-content>
            </ng-template>
        </div>
    `,
})
export default class SelectToCreate {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types, typeof FEATURES>(
        {
            version: 1,
            events: teamWeek(),
            calendars: CALENDARS,
            view: { type: "week", anchorDate: day() },
        },
        { features: FEATURES },
    );
    protected readonly range = signal<Range | null>(null);
    protected readonly title = signal("");
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement));
    }

    protected close() {
        this.range.set(null);
        this.title.set("");
        this.model.run("selection.clear", {});
    }

    protected save() {
        const range = this.range();
        if (!range) return;
        this.model.run("event.add", {
            title: this.title().trim() || "New event",
            start: range.start,
            end: range.end,
            allDay: range.allDay,
            calendarId: "ada",
            kind: "meeting",
        });
        this.close();
    }

    protected onOpenChange(open: boolean) {
        if (!open) this.close();
    }

    /** The range in words (app formatting: the calendar gives the times as data). */
    protected when(range: Range | null): string {
        if (!range) return "";
        if (range.allDay) {
            return `All day, from ${range.start} to before ${range.end}`;
        }
        const format = dateTimeFormat("en-US", {
            weekday: "long",
            hour: "numeric",
            minute: "2-digit",
        });
        return format.formatRange(
            Date.parse(range.start),
            Date.parse(range.end),
        );
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
