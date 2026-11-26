import type {
    AnyTypes,
    CalendarEngine,
    CalendarFeatures,
    CalendarModel,
    CalendarTypes,
} from "@fragiola/calendar";
import { typedEngine, typedModel, useCalendarContext } from "../context";

export interface UseCalendarResult<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> {
    /**
     * the model of the enclosing `Calendar.Root`: the calendar's data, its view and its rules.
     * Change it with `model.run("event.move", { eventId, delta })`, read it with `model.get`
     */
    model: CalendarModel<T, F>;
    /**
     * the engine of the calendar on screen: screen actions (`engine.run("focus", { date })`) and
     * screen facts (`engine.get("drag-preview")`). It is there from the first render; before the
     * root is mounted (and on the server) an action is refused and a read is empty
     */
    engine: CalendarEngine<T, F>;
}

/**
 * The model and the engine of the enclosing `Calendar.Root`. Pass the model's registry and
 * features as the type arguments (`useCalendar<Types, typeof features>()`): a child cannot infer
 * them through context.
 */
export function useCalendar<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
>(): UseCalendarResult<T, F> {
    const context = useCalendarContext("useCalendar");
    return {
        model: typedModel<T, F>(context.model),
        engine: typedEngine<T, F>(context.publicEngine),
    };
}
