// The navigation buttons' wiring (`[calendarPrevious]`, `[calendarNext]`, `[calendarToday]`,
// `[calendarViewButton]`): the part's attributes, `disabled` while the model cannot run its
// command, `type="button"` on a button with none (your attributes win), and a click that runs it.
import { computed, effect, type Signal } from "@angular/core";
import type {
    PartAttributes,
    PartName,
    PartPayloadMap,
} from "@fragiola/calendar";
import {
    bindPart,
    type CalendarContext,
    type CommandButtonState,
    flag,
    injectHost,
} from "@fragiola/calendar-angular/internal";

/** A navigation button bound to its element. */
export interface CommandButton {
    readonly attributes: Signal<PartAttributes>;
    readonly state: Signal<CommandButtonState>;
    /** runs the command, unless it is disabled */
    click(run: () => void): void;
}

/** Binds the navigation button being created (call it in its constructor). */
export function bindCommandButton<
    P extends "previous" | "next" | "today" | "view-button",
>(
    context: CalendarContext,
    part: P,
    payload: () => PartPayloadMap[P] | undefined,
): CommandButton {
    const element = injectHost();
    if (element.tagName === "BUTTON" && !element.hasAttribute("type")) {
        element.setAttribute("type", "button");
    }
    const attributes = bindPart(
        context,
        element,
        part as PartName,
        payload as () => PartPayloadMap[PartName] | undefined,
    );
    const state = computed(() => ({
        disabled: flag(attributes(), "disabled"),
    }));
    effect(() => {
        const disabled = state().disabled;
        if ("disabled" in element) {
            (element as HTMLButtonElement).disabled = disabled;
        }
    });
    return {
        attributes,
        state,
        click: (run) => {
            if (!state().disabled) run();
        },
    };
}
