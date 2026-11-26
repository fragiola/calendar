// Type fixtures (compiled by `pnpm typecheck`, never run): the verbs are typed by their keys, an
// event's data narrows on its kind through the app's `Types` registry, and the two forms of the
// model type (`features.md#typing`): a model with features is assignable to `CalendarModel<T>`
// (any features), whose verbs check the core's keys. `@ts-expect-error` marks what must not compile.
import {
    type CalendarFeature,
    type CalendarModel,
    createCalendarModel,
    defineFeature,
} from "../../src/index";

type Types = {
    events: { meeting: { room: string }; reminder: undefined };
    calendar: { color: string };
};

declare const json: Parameters<typeof createCalendarModel<Types>>[0];
const model = createCalendarModel<Types>(json);

// a command and its payload read as one sentence
model.run("event.move", { eventId: "a", delta: { days: 1 } });
model.run("view.go-to", { date: { year: 2026, month: 11, day: 26 } });
// @ts-expect-error: no such command
model.run("event.fly", {});
// @ts-expect-error: a move takes a start or a delta
model.run("event.move", { eventId: "a" });
// @ts-expect-error: eventId is a string
model.can("event.remove", { eventId: 1 });

// data narrows on the kind
const event = model.get("event-by", { id: "a" });
if (event?.kind === "meeting") {
    const room: string | undefined = event.data?.room;
    void room;
}
model.run("event.set-data", {
    eventId: "a",
    kind: "meeting",
    data: { room: "Blue" },
});
model.run("event.set-data", {
    eventId: "a",
    kind: "meeting",
    // @ts-expect-error: a meeting's data has a room
    data: { seats: 3 },
});
model.run("event.add", {
    title: "Standup",
    start: "2026-11-26",
    allDay: true,
    kind: "meeting",
    data: { room: "Blue" },
});
// @ts-expect-error: a meeting needs its data
model.run("event.add", {
    title: "x",
    start: "2026-11-26",
    allDay: true,
    kind: "meeting",
});
const color: string | undefined = model.get("calendar-by", { id: "c" })?.data
    ?.color;
void color;

// reads: a key names its result, and a payload is required only when it has a required field
const view: "month" | "week" | "day" | "days" | "list" = model.get("view").type;
void view;
model.get("day-grid");
model.get("day-grid", { maxLanes: 3 });
model.is("list-empty");
// @ts-expect-error: event-by needs an id
model.get("event-by");
// @ts-expect-error: no such key
model.get("nothing");
// @ts-expect-error: no such question
model.is("event-flying", { eventId: "a" });

// middleware narrows the payload on the command
model.use((ctx, next) => {
    if (ctx.command === "event.resize") {
        const edge: "start" | "end" = ctx.payload.edge;
        void edge;
    }
    return next();
});

// a model with features is a model of any features
const recurrence = defineFeature<"recurrence", { readonly expanded: number }>({
    name: "recurrence",
});
// (TypeScript infers no type argument once one is given: the features' tuple is written too)
const featured = createCalendarModel<Types, readonly [typeof recurrence]>(
    json,
    {
        features: [recurrence],
    },
);
const inferred = createCalendarModel(undefined, { features: [recurrence] });
const inferredExpanded: number = inferred.state.expanded;
void inferredExpanded;
const expanded: number = featured.state.expanded;
void expanded;
const anyModel: CalendarModel<Types> = featured;
const bare: CalendarModel<Types> = model;
void anyModel;
void bare;
// @ts-expect-error: a bare model has no feature state
void model.state.expanded;

// a feature's own types
const feature: CalendarFeature<"selection"> = defineFeature({
    name: "selection",
});
void feature;
// @ts-expect-error: not a feature of the calendar
defineFeature({ name: "teleport" });
