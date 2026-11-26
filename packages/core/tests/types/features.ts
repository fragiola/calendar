// Type fixtures (compiled by `pnpm typecheck`, never run): the model features' commands, keys and
// payload fields compile only with their feature installed (`features.md#typing`), their state
// slice types `model.state`, and their schemas are their types.

import type {
    CommandName,
    PayloadOf,
    ResultOf,
} from "../../src/commands/types";
import { constraints } from "../../src/constraints/index";
import type { AnyTypes } from "../../src/document/calendar-types";
import type {
    eventSourcesInvalidate,
    eventSourcesReceive,
    eventSourcesSetLoading,
} from "../../src/event-sources/commands/source-commands";
import { eventSources } from "../../src/event-sources/index";
import { createCalendarModel } from "../../src/index";
import type { eventSetRecurrence } from "../../src/recurrence/commands/event-set-recurrence";
import { recurrence } from "../../src/recurrence/index";
import type { FromSchema } from "../../src/schema/from-schema";
import type {
    selectionClear,
    selectionSet,
} from "../../src/selection/commands/selection-commands";

const bare = createCalendarModel();
const full = createCalendarModel(undefined, {
    features: [recurrence(), constraints(), eventSources()],
});

full.run("event.move", {
    eventId: "w",
    occurrenceId: "w@2026-11-02T09:00:00-05:00",
    scope: "following",
    delta: { minutes: 30 },
});
full.run("event.set-recurrence", {
    eventId: "w",
    recurrence: { rule: "FREQ=DAILY" },
});
full.run("event-sources.receive", {
    sourceId: "s",
    range: { start: "2026-11-01", end: "2026-12-01" },
    events: [],
});
const occurrences = full.get("occurrences-in", {
    range: { start: "2026-11-01", end: "2026-12-01" },
});
void occurrences;
const hours = full.get("business-hours-in");
void hours;
const toFetch: readonly { sourceId: string }[] = full.get("ranges-to-fetch");
void toFetch;
void full.is("event-recurring", { eventId: "w" });
void full.is("event-source-loading");
const fetched: readonly unknown[] | undefined =
    full.state.eventSourceStates.s?.fetched;
void fetched;

// @ts-expect-error: recurrence()'s command
bare.run("event.set-recurrence", { eventId: "w", recurrence: null });
// @ts-expect-error: eventSources()'s command
bare.run("event-sources.invalidate", {});
// @ts-expect-error: recurrence()'s key
bare.get("occurrences-in", {
    range: { start: "2026-11-01", end: "2026-12-01" },
});
// @ts-expect-error: constraints()'s key
bare.get("business-hours-in");
// @ts-expect-error: eventSources()'s question
bare.is("event-source-loading");
// @ts-expect-error: a scope is not a string
full.run("event.remove", { eventId: "w", scope: "some" });

/** Mutually assignable. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Check<
    C extends CommandName,
    D extends { payloadSchema: unknown; resultSchema: unknown },
> = [
    Same<FromSchema<D["payloadSchema"]>, PayloadOf<AnyTypes, C>>,
    Same<FromSchema<D["resultSchema"]>, ResultOf<AnyTypes, C>>,
];

/** Compiles only when every entry is `[true, true]`. */
export type FeatureSchemasMatchTypes = [
    Check<"event.set-recurrence", typeof eventSetRecurrence>,
    Check<"event-sources.receive", typeof eventSourcesReceive>,
    Check<"event-sources.invalidate", typeof eventSourcesInvalidate>,
    Check<"event-sources.set-loading", typeof eventSourcesSetLoading>,
    Check<"selection.set", typeof selectionSet>,
    Check<"selection.clear", typeof selectionClear>,
] extends [true, true][]
    ? true
    : never;

export const featureSchemasMatchTypes: FeatureSchemasMatchTypes = true;
