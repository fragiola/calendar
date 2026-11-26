import { computed, Directive, input, type Signal } from "@angular/core";
import {
    beforeInputs,
    bindPart,
    CALENDAR_SLOT_ROW,
    flag,
    injectCalendarContext,
    injectHost,
    injectRequired,
} from "@fragiola/calendar-angular/internal";

/** What a time-grid slot shows (`[calendarSlot]`, `injectSlot`). */
export interface SlotState {
    /** its day, `YYYY-MM-DD` */
    date: string;
    /** its wall-clock start, `HH:mm` */
    time: string;
    /** it holds the roving focus */
    focused: boolean;
    /** a selected range covers it (`selection()`) */
    selected: boolean;
    /** outside `validRange` */
    disabled: boolean;
    /** its start is within business hours (`constraints()`) */
    businessHours: boolean;
}

/**
 * A day's cell of a slot row (`role="gridcell"`, `data-date`, `data-time`, `data-selected`, …):
 * `<div [calendarSlot]="column.date">`, one cell of the grid's roving focus; a press selects from
 * it with `selection()`.
 */
@Directive({ selector: "[calendarSlot]", exportAs: "calendarSlot" })
export class CalendarSlotDirective {
    /** its day, from `<ng-template calendarSlots let-column>` (`column.date`) */
    readonly calendarSlot = input.required<string>();

    private readonly context = injectCalendarContext("[calendarSlot]");
    private readonly row = injectRequired(
        CALENDAR_SLOT_ROW,
        "[calendarSlot]",
        "[calendarSlotRow]",
    );
    private readonly date = computed(() =>
        beforeInputs(undefined, this.calendarSlot),
    );
    private readonly attributes = bindPart(
        this.context,
        injectHost(),
        "slot",
        () => {
            const date = this.date();
            const slot = this.row.slot();
            return date !== undefined && slot
                ? { date, time: slot.time }
                : undefined;
        },
    );

    /** what it shows (`undefined` until its day and row are known) */
    readonly state: Signal<SlotState | undefined> = computed(() => {
        const date = this.date();
        const slot = this.row.slot();
        const attributes = this.attributes();
        return date !== undefined && slot
            ? {
                  date,
                  time: slot.time,
                  focused: flag(attributes, "focused"),
                  selected: flag(attributes, "selected"),
                  disabled: flag(attributes, "disabled"),
                  businessHours: flag(attributes, "business-hours"),
              }
            : undefined;
    });
}
