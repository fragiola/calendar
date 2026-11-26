import { useCalendarContext } from "../context";
import { flag, type PartHookResult, usePart } from "./internal";

/** What a time-grid slot shows (`Calendar.Slot`, `useSlot`). */
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
 * A slot of a time grid (a day's cell at a time): its state and the props of its element
 * (`role="gridcell"`, `data-date`, `data-time`, the roving tab stop, its registration).
 */
export function useSlot(slot: {
    date: string;
    time: string;
}): PartHookResult<SlotState> {
    const context = useCalendarContext("useSlot");
    const { attributes, props, ref } = usePart(context, "slot", {
        date: slot.date,
        time: slot.time,
    });
    return {
        state: {
            date: slot.date,
            time: slot.time,
            focused: flag(attributes, "focused"),
            selected: flag(attributes, "selected"),
            disabled: flag(attributes, "disabled"),
            businessHours: flag(attributes, "business-hours"),
        },
        props: { ...props, ref },
    };
}
