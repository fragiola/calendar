// The planner's data and rules, as app code: the team's week with a recurring standup, the
// features it installs, and the middleware that asks which occurrences an edit of a series changes.
import {
    type CalendarEventJson,
    type CalendarModel,
    type EditScope,
    type EventMovePayload,
    type EventResizePayload,
    type Middleware,
    veto,
} from "@fragiola/calendar-vue";
import { constraints } from "@fragiola/calendar-vue/constraints";
import { dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { nowIndicator } from "@fragiola/calendar-vue/now-indicator";
import { recurrence } from "@fragiola/calendar-vue/recurrence";
import { resize } from "@fragiola/calendar-vue/resize";
import { selection } from "@fragiola/calendar-vue/selection";
import { at, type Types, teamWeek, weekday } from "../_kit/data";

/** Everything the planner does: each feature is an opt-in entry. */
export const features = [
    selection(),
    dragAndDrop(),
    resize(),
    recurrence(),
    constraints(),
    nowIndicator(),
] as const;

export type PlannerModel = CalendarModel<Types, typeof features>;

/** This computer's zone: a series keeps its wall clock in it across daylight saving time. */
const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** The team's week, and a standup every weekday from Monday. */
export function plannerEvents(): CalendarEventJson<Types>[] {
    return [
        ...teamWeek(),
        {
            id: "standup",
            kind: "meeting",
            title: "Standup",
            start: at(weekday(1), "09:00"),
            end: at(weekday(1), "09:30"),
            allDay: false,
            calendarId: "company",
            timeZone: ZONE,
            recurrence: { rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
        },
    ];
}

/** An edit of an occurrence of a series, waiting for the person to pick its scope. */
export type PendingEdit =
    | { command: "event.move"; payload: EventMovePayload }
    | { command: "event.resize"; payload: EventResizePayload };

/** `meta` of an edit whose scope was picked: the middleware lets it through. */
const PICKED = { scopePicked: true } as const;

/**
 * Stops a move or a resize of a recurring occurrence (a drag's drop, the keyboard's) and hands it
 * to `ask`, which asks "this event, the following ones, or all of them?". Checks (a drag's hover)
 * and edits whose scope was picked pass.
 */
export function askForScope(
    ask: (edit: PendingEdit) => void,
): Middleware<Types> {
    return (ctx, next) => {
        if (ctx.dryRun || ctx.inBatch || ctx.meta?.scopePicked === true) {
            return next();
        }
        if (ctx.command === "event.move" && ctx.payload.occurrenceId) {
            ask({ command: ctx.command, payload: ctx.payload });
            return veto("asking which occurrences to change");
        }
        if (ctx.command === "event.resize" && ctx.payload.occurrenceId) {
            ask({ command: ctx.command, payload: ctx.payload });
            return veto("asking which occurrences to change");
        }
        return next();
    };
}

/** Runs a pending edit with the scope the person picked. */
export function runWithScope(
    model: PlannerModel,
    edit: PendingEdit,
    scope: EditScope,
) {
    if (edit.command === "event.move") {
        model.run("event.move", { ...edit.payload, scope }, { meta: PICKED });
    } else {
        model.run("event.resize", { ...edit.payload, scope }, { meta: PICKED });
    }
}
