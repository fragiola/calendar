import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useCalendarContext } from "../context";
import { flag, type PartComposableResult, usePart } from "./internal";

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
 * (`role="gridcell"`, `data-date`, `data-time`, the roving tab stop, the template ref that
 * registers it). Call it in `setup`, with the slot (a value, a ref or a getter).
 */
export function useSlot(
    slot: MaybeRefOrGetter<{ date: string; time: string }>,
): PartComposableResult<SlotState> {
    const context = useCalendarContext("useSlot");
    const { attributes, props, ref } = usePart(context, "slot", () => {
        const { date, time } = toValue(slot);
        return { date, time };
    });
    const state = computed<SlotState>(() => {
        const current = attributes.value;
        const { date, time } = toValue(slot);
        return {
            date,
            time,
            focused: flag(current, "focused"),
            selected: flag(current, "selected"),
            disabled: flag(current, "disabled"),
            businessHours: flag(current, "business-hours"),
        };
    });
    return { state, props: computed(() => ({ ...props.value, ref })) };
}
