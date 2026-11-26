import type { Signal } from "@angular/core";
import { computed } from "@angular/core";
import type {
    AnyTypes,
    CalendarEngine,
    CalendarFeatures,
    CalendarModel,
    CalendarTypes,
} from "@fragiola/calendar";
import {
    injectCalendarContext,
    typedEngine,
    typedModel,
} from "@fragiola/calendar-angular/internal";

export interface InjectCalendarResult<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> {
    /**
     * the model of the enclosing `[calendarRoot]`: the calendar's data, its view and its rules.
     * Change it with `model().run("event.move", { eventId, delta })`, read it with `model().get`
     */
    model: Signal<CalendarModel<T, F>>;
    /**
     * the engine of the calendar on screen: screen actions (`engine.run("focus", { date })`) and
     * screen facts (`engine.get("drag-preview")`). It is there from the start; before the root
     * created its engine (and on the server) an action is refused and a read is empty
     */
    engine: CalendarEngine<T, F>;
}

/**
 * The model and the engine of the enclosing `[calendarRoot]` (React's `useCalendar`). Pass the
 * model's registry and features as the type arguments (`injectCalendar<Types, typeof features>()`):
 * a child cannot infer them through injection. Call it in an injection context (a constructor or a
 * field initializer).
 */
export function injectCalendar<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
>(): InjectCalendarResult<T, F> {
    const context = injectCalendarContext("injectCalendar");
    return {
        model: computed(() => typedModel<T, F>(context.model())),
        engine: typedEngine<T, F>(context.publicEngine),
    };
}
