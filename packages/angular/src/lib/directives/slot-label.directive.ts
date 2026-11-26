import { computed, Directive, type Signal } from "@angular/core";
import {
    bindPart,
    CALENDAR_SLOT_ROW,
    injectCalendarContext,
    injectHost,
    injectRequired,
} from "@fragiola/calendar-angular/internal";

export interface SlotLabelState {
    /** the slot's wall-clock start, `HH:mm` (`injectSlotLabel(time)` gives it as parts) */
    time: string;
}

/** A slot row's label (`role="rowheader"`, `data-time`), inside a `[calendarSlotRow]`: what it shows is yours. */
@Directive({ selector: "[calendarSlotLabel]", exportAs: "calendarSlotLabel" })
export class CalendarSlotLabelDirective {
    private readonly context = injectCalendarContext("[calendarSlotLabel]");
    private readonly row = injectRequired(
        CALENDAR_SLOT_ROW,
        "[calendarSlotLabel]",
        "[calendarSlotRow]",
    );

    /** what it shows (`undefined` until its row is known) */
    readonly state: Signal<SlotLabelState | undefined> = computed(() => {
        const slot = this.row.slot();
        return slot ? { time: slot.time } : undefined;
    });

    constructor() {
        bindPart(this.context, injectHost(), "slot-label", () => {
            const slot = this.row.slot();
            return slot ? { time: slot.time } : undefined;
        });
    }
}
