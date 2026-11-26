import {
    type CommandButtonState,
    useCommandButton,
} from "../composables/internal";
import { useCalendarContext } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export type TodayState = CommandButtonState;

export interface TodayProps extends PrimitiveProps {}

export interface TodaySlots extends RenderSlot<TodayState> {
    /** its label: elements or text of the app's */
    default?: SlotFunction<TodayState>;
}

/**
 * A button that goes to the range of today (`view.today`); disabled (`disabled`,
 * `data-disabled`) when the model cannot.
 */
export const Today: CalendarComponent<TodayProps, TodaySlots> = definePrimitive<
    TodayProps,
    TodaySlots
>("Today", ["as"], (props, { attrs, slots }) => {
    const context = useCalendarContext("Today");
    const { state, wiring, onClick } = useCommandButton(
        context,
        "today",
        () => ({}),
        () => context.model.run("view.today", {}),
    );
    return () =>
        renderElement({
            tag: "button",
            as: props.as,
            attrs,
            render: slots.render,
            state: state.value,
            props: {
                type: "button",
                ...wiring.props.value,
                disabled: state.value.disabled,
                onClick,
            },
            ref: wiring.ref,
            children: () => slots.default?.(state.value),
        });
});
