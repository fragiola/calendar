import { computed, Directive, inject, input, type Signal } from "@angular/core";
import type { TimeSlot } from "@fragiola/calendar";
import {
    beforeInputs,
    bindPart,
    CALENDAR_SLOT_ROW,
    injectCalendarContext,
    injectHost,
    type SlotRowContext,
} from "@fragiola/calendar-angular/internal";

export interface SlotRowState {
    /** the slot: its `time` (`HH:mm`) and its place in a column (`top`, `height` fractions) */
    slot: TimeSlot;
}

/**
 * A time grid's row at one time (`role="row"`, `data-time`): `<div [calendarSlotRow]="slot">`, its
 * `[calendarSlotLabel]` and a slot per day (`<ng-template calendarSlots let-column>`).
 */
@Directive({
    selector: "[calendarSlotRow]",
    exportAs: "calendarSlotRow",
    providers: [
        {
            provide: CALENDAR_SLOT_ROW,
            useFactory: () => inject(CalendarSlotRowDirective).rowContext,
        },
    ],
})
export class CalendarSlotRowDirective {
    /** the slot, from `<ng-template calendarSlotRows let-slot>` */
    readonly calendarSlotRow = input.required<TimeSlot>();

    private readonly context = injectCalendarContext("[calendarSlotRow]");
    private readonly slot = computed(() =>
        beforeInputs(undefined, this.calendarSlotRow),
    );

    /** @internal what the parts inside read */
    readonly rowContext: SlotRowContext = { slot: this.slot };

    /** what it shows (`undefined` until its slot is set) */
    readonly state: Signal<SlotRowState | undefined> = computed(() => {
        const slot = this.slot();
        return slot ? { slot } : undefined;
    });

    constructor() {
        bindPart(this.context, injectHost(), "slot-row", () => {
            const slot = this.slot();
            return slot ? { time: slot.time } : undefined;
        });
    }
}
