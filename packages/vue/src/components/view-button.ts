import type { ViewType } from "@fragiola/calendar";
import { computed } from "vue";
import {
    type CommandButtonState,
    flag,
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

export interface ViewButtonState extends CommandButtonState {
    /** its view is the one shown (`aria-pressed`) */
    pressed: boolean;
}

export interface ViewButtonProps extends PrimitiveProps {
    /** the view it shows (`view.set`) */
    view: ViewType;
    /** a `days` view's number of days */
    days?: number | undefined;
}

export interface ViewButtonSlots extends RenderSlot<ViewButtonState> {
    /** its label: elements or text of the app's */
    default?: SlotFunction<ViewButtonState>;
}

/** A toggle button that shows a view (`view.set`), pressed (`aria-pressed`) while it is shown. */
export const ViewButton: CalendarComponent<ViewButtonProps, ViewButtonSlots> =
    definePrimitive<ViewButtonProps, ViewButtonSlots>(
        "ViewButton",
        ["view", "days", "as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("ViewButton");
            const payload = () =>
                props.days === undefined
                    ? { type: props.view }
                    : { type: props.view, days: props.days };
            const { state, wiring, onClick } = useCommandButton(
                context,
                "view-button",
                payload,
                () => context.model.run("view.set", payload()),
            );
            const full = computed<ViewButtonState>(() => ({
                ...state.value,
                pressed: flag(wiring.attributes.value, "pressed"),
            }));
            return () =>
                renderElement({
                    tag: "button",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state: full.value,
                    props: {
                        type: "button",
                        ...wiring.props.value,
                        disabled: state.value.disabled,
                        onClick,
                    },
                    ref: wiring.ref,
                    children: () => slots.default?.(full.value),
                });
        },
    );
