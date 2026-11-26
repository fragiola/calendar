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

export type NextState = CommandButtonState;

export interface NextProps extends PrimitiveProps {}

export interface NextSlots extends RenderSlot<NextState> {
    /** its label: elements or text of the app's */
    default?: SlotFunction<NextState>;
}

/**
 * A button that goes to the next range (`view.next`): a month on in a month view, a week in a week
 * view; disabled (`disabled`, `data-disabled`) when the model cannot.
 */
export const Next: CalendarComponent<NextProps, NextSlots> = definePrimitive<
    NextProps,
    NextSlots
>("Next", ["as"], (props, { attrs, slots }) => {
    const context = useCalendarContext("Next");
    const { state, wiring, onClick } = useCommandButton(
        context,
        "next",
        () => ({}),
        () => context.model.run("view.next", {}),
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
