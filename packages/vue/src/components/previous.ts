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

export type PreviousState = CommandButtonState;

export interface PreviousProps extends PrimitiveProps {}

export interface PreviousSlots extends RenderSlot<PreviousState> {
    /** its label: elements or text of the app's */
    default?: SlotFunction<PreviousState>;
}

/**
 * A button that goes to the previous range (`view.previous`): a month back in a month view, a week
 * in a week view; disabled (`disabled`, `data-disabled`) when the model cannot.
 */
export const Previous: CalendarComponent<PreviousProps, PreviousSlots> =
    definePrimitive<PreviousProps, PreviousSlots>(
        "Previous",
        ["as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("Previous");
            const { state, wiring, onClick } = useCommandButton(
                context,
                "previous",
                () => ({}),
                () => context.model.run("view.previous", {}),
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
        },
    );
