// Type fixtures (compiled by `pnpm typecheck`, never run): the engine's verbs are typed from its
// model's features (`features.md#typing`): a feature's engine keys compile only with it installed,
// and the model's and the engine's surfaces are exactly their verbs (D20).

import { dragAndDrop } from "../../src/drag-and-drop/index";
import type { CalendarEngine } from "../../src/engine/calendar-engine";
import { externalDrop } from "../../src/external-drop/index";
import { createCalendarEngine, createCalendarModel } from "../../src/index";
import type { CalendarModel } from "../../src/model/calendar-model";
import { nowIndicator } from "../../src/now-indicator/index";
import { resize } from "../../src/resize/index";
import { selection } from "../../src/selection/index";

const bare = createCalendarEngine(
    createCalendarModel(undefined, { features: [] }),
);
const model = createCalendarModel(undefined, {
    features: [
        selection(),
        dragAndDrop({ recurringScope: "all" }),
        resize(),
        externalDrop(),
        nowIndicator({ interval: 30_000 }),
    ],
});
const full = createCalendarEngine(model);

void full.get("drag-preview")?.weeks;
void full.get("resize-preview");
void full.get("selection-preview");
void full.get("now-position")?.top;
void full.is("event-grabbed", { occurrenceId: "a" });
full.run("external-drag-start", { event: { title: "Lunch" } });
full.run("external-drag-move", { clientX: 1, clientY: 2 });
full.run("focus", { date: "2026-11-26", time: "09:00" });
model.run("selection.set", {
    start: "2026-11-26",
    end: "2026-11-27",
    allDay: true,
});
const range: { start: string } | null = model.get("selected-range");
void range;

// @ts-expect-error: dragAndDrop()'s key
bare.get("drag-preview");
// @ts-expect-error: resize()'s question
bare.is("event-resizing", { occurrenceId: "a" });
// @ts-expect-error: externalDrop()'s action
bare.run("external-drag-end", {});
// @ts-expect-error: nowIndicator()'s key
bare.get("now-position");
// @ts-expect-error: a focus takes a date or an occurrence
full.run("focus", { time: "09:00" });

/** Mutually assignable. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** The model is its verbs and its state, nothing more. */
export const modelSurface: Same<
    keyof CalendarModel,
    | "state"
    | "run"
    | "dispatch"
    | "can"
    | "check"
    | "get"
    | "is"
    | "use"
    | "subscribe"
> = true;

/** The engine is its verbs, `subscribe`, `destroy` and `adapter`, nothing more. */
export const engineSurface: Same<
    keyof CalendarEngine,
    "run" | "can" | "check" | "get" | "is" | "subscribe" | "destroy" | "adapter"
> = true;
