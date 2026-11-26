// `@fragiola/calendar/drag-and-drop`: the `dragAndDrop()` feature (D13, D14). Events move by
// pointer (a press on an event past the drag threshold, or a touch long press) across days and
// between the all-day row and the time grid (D10), and by keyboard (Space grabs a focused event,
// arrows move it, Enter drops, Escape cancels). While it moves, `engine.get("drag-preview")` is
// where it would land: `model.can` answers each target, a refused one shows no preview, and the
// drop runs one `event.move` (the scope of `recurringScope` for a recurring occurrence, D15).
import type { EditScope } from "../commands/types";
import { dragSessionOf } from "../drop-target/drag-session";
import { moveRequest } from "../drop-target/move-target";
import { defineFeature } from "../features/define-feature";
import type { FeatureGesture } from "../features/engine-types";
import type { CalendarFeature } from "../features/types";

export type {
    DragPreview,
    PreviewSegments,
    PreviewTimes,
} from "../engine/preview";

/** Options of {@link dragAndDrop}. */
export interface DragAndDropOptions {
    /**
     * the scope a drop of a recurring event's occurrence runs with (D15): `"this"` (the default,
     * the least destructive), `"following"` or `"all"`; an app that asks the user does it in a
     * middleware, or with `model.check` first. Ignored on events that do not recur
     */
    recurringScope?: EditScope | undefined;
}

/** The drag and drop feature, as `createCalendarModel`'s `features` takes it. */
export type DragAndDropFeature = CalendarFeature<"drag-and-drop">;

/** Moving events by pointer and keyboard, previewed as engine view state (D14). */
export function dragAndDrop(
    options: DragAndDropOptions = {},
): DragAndDropFeature {
    const scope = options.recurringScope ?? "this";
    return defineFeature({
        name: "drag-and-drop",
        engine: (host) => {
            const session = dragSessionOf(host);
            session.moves = true;
            session.recurringScope = scope;
            const dragged = (
                kind: "pointer" | "keyboard",
                payload: unknown,
            ) => {
                const { occurrenceId } = (payload ?? {}) as {
                    occurrenceId?: unknown;
                };
                const activity = session.activity;
                return (
                    activity !== null &&
                    activity.kind === "move" &&
                    activity.keyboard === (kind === "keyboard") &&
                    activity.occurrenceId === occurrenceId
                );
            };
            return {
                dragsEvents: true,
                get: {
                    "drag-preview": () =>
                        session.preview && session.preview.kind !== "resize"
                            ? session.preview
                            : null,
                },
                is: {
                    "event-dragging": (payload) => dragged("pointer", payload),
                    "event-grabbed": (payload) => dragged("keyboard", payload),
                },
                pointerdown: (_event, target): FeatureGesture | undefined => {
                    if (
                        target.kind !== "event" ||
                        target.occurrenceId === undefined ||
                        target.point === null ||
                        session.activity !== null
                    ) {
                        return undefined;
                    }
                    const occurrence = host.occurrence(target.occurrenceId);
                    if (
                        !occurrence ||
                        !host.model.is("event-start-editable", {
                            eventId: occurrence.eventId,
                        })
                    ) {
                        return undefined;
                    }
                    const origin = target.point;
                    let started = false;
                    let moved = false;
                    let key = "";
                    const evaluate = (clientX: number, clientY: number) => {
                        const point = host.pointAt(clientX, clientY);
                        const next = point ? JSON.stringify(point) : "outside";
                        if (next === key) return;
                        key = next;
                        if (!point) {
                            session.show(null);
                            return;
                        }
                        const plan = session.movePlan(
                            occurrence,
                            moveRequest(origin, point, host.timeZone()),
                        );
                        moved ||= plan !== undefined;
                        session.show(
                            plan
                                ? session.evaluate(
                                      plan,
                                      "move",
                                      false,
                                      occurrence.occurrenceId,
                                  )
                                : session.still(occurrence, "move", false),
                        );
                    };
                    return {
                        move: (event) => {
                            if (!started) {
                                started = true;
                                session.begin({
                                    kind: "move",
                                    occurrenceId: occurrence.occurrenceId,
                                    keyboard: false,
                                });
                            }
                            evaluate(event.clientX, event.clientY);
                        },
                        end: (event) => {
                            evaluate(event.clientX, event.clientY);
                            const point = host.pointAt(
                                event.clientX,
                                event.clientY,
                            );
                            const plan =
                                point &&
                                session.movePlan(
                                    occurrence,
                                    moveRequest(origin, point, host.timeZone()),
                                );
                            if (plan && session.preview) {
                                session.drop(plan, occurrence, "move", false);
                            } else {
                                session.cancelled();
                            }
                        },
                        cancel: () => {
                            if (started) session.cancelled();
                        },
                        active: () => moved,
                    };
                },
                keydown: (event, target) => {
                    if (
                        event.key !== " " ||
                        event.ctrlKey ||
                        event.altKey ||
                        event.metaKey ||
                        target?.kind !== "event" ||
                        session.activity !== null
                    ) {
                        return undefined;
                    }
                    const occurrence = host.occurrence(target.occurrenceId);
                    if (
                        !occurrence ||
                        !host.model.is("event-start-editable", {
                            eventId: occurrence.eventId,
                        })
                    ) {
                        return undefined;
                    }
                    return session.grab(occurrence);
                },
                attributes: (part, payload, into) => {
                    if (part !== "event") return;
                    const activity = session.activity;
                    if (
                        activity?.kind !== "move" ||
                        activity.occurrenceId !== payload.occurrenceId
                    ) {
                        return;
                    }
                    if (activity.keyboard) into["data-grabbed"] = "";
                    else into["data-dragging"] = "";
                },
                detached: () => {
                    if (session.activity) session.finish();
                },
            };
        },
    });
}
