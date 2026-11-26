// Type fixtures (compiled by `pnpm typecheck`, never run): the root's feature callbacks, the
// refs' and hooks' engines are typed by the model's features. `@ts-expect-error` marks what must
// not compile.
import {
    Calendar,
    type CalendarEngineEventOf,
    type CalendarTypes,
    createCalendarModel,
    useCalendar,
    useCalendarRef,
} from "../../src";
import { dragAndDrop } from "../../src/drag-and-drop";
import { resize } from "../../src/resize";
import { selection } from "../../src/selection";

type Types = CalendarTypes & {
    events: { meeting: { room: string }; task: undefined };
};

const features = [selection(), dragAndDrop()] as const;
const model = createCalendarModel<Types, typeof features>(undefined, {
    features,
});
const bare = createCalendarModel<Types>();

export function WithFeatures() {
    const calendar = useCalendarRef<Types, typeof features>();
    void calendar.current?.engine.get("drag-preview");
    void calendar.current?.engine.get("selection-segments");
    return (
        <Calendar.Root
            model={model}
            calendarRef={calendar}
            // a callback inferred with the model's features takes its type annotation (as Tree's)
            onSelect={(event: CalendarEngineEventOf<"select">) =>
                void event.range.start
            }
            onEventDrop={(event: CalendarEngineEventOf<"drop">) =>
                void event.start
            }
            onEventClick={(event) => void event.eventId}
        />
    );
}

export function WithoutFeatures() {
    const calendar = useCalendarRef<Types>();
    // @ts-expect-error the drag and drop feature is not installed
    void calendar.current?.engine.get("drag-preview");
    const { engine } = useCalendar<Types>();
    // @ts-expect-error the selection feature is not installed
    void engine.get("selection-preview");
    return (
        <>
            {/* @ts-expect-error onSelect needs the selection feature */}
            <Calendar.Root model={bare} onSelect={() => {}} />
            {/* @ts-expect-error onEventDrop needs dragAndDrop() or resize() */}
            <Calendar.Root model={bare} onEventDrop={() => {}} />
            <Calendar.Root<Types, readonly [ReturnType<typeof resize>]>
                features={[resize()]}
                onEventDrop={(event) => void event.kind}
            />
            <Calendar.Root
                model={bare}
                onDateClick={(event) => void event.date}
            />
            {/* @ts-expect-error a root's features type its model */}
            <Calendar.Root<Types> features={features} />
        </>
    );
}
