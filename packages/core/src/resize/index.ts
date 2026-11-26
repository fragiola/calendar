// `@fragiola/calendar/resize`: the `resize()` feature (D13, D14). A press on an event's resize
// handle (`engine.adapter.register("resize-handle", { occurrenceId, date, edge }, element)`) moves
// its start or end, snapped to `snapDuration` in the time grid and by days on a day grid; with a
// keyboard grab (Space on a focused event), Shift + Up/Down (time grid) or Shift + Left/Right (day
// grid) move its end. `engine.get("resize-preview")` is the new times while it goes, `model.can`
// answering each target; the release runs one `event.resize`.
import { dragSessionOf } from "../drop-target/drag-session";
import { minutesBetweenPoints, shiftedEdge } from "../drop-target/move-target";
import type { GridPoint } from "../engine/grid-point";
import { dayDelta } from "../engine/hit-test";
import { defineFeature } from "../features/define-feature";
import type { FeatureGesture } from "../features/engine-types";
import type { CalendarFeature } from "../features/types";
import type { Occurrence } from "../layout/occurrence";

export type { DragPreview } from "../engine/preview";

/** The resize feature, as `createCalendarModel`'s `features` takes it. */
export type ResizeFeature = CalendarFeature<"resize">;

/** An occurrence's edge moved from the point a resize started at to `point`, or `undefined`. */
function edgeAt(
    occurrence: Occurrence,
    edge: "start" | "end",
    origin: GridPoint,
    point: GridPoint,
    timeZone: string,
): string | undefined {
    if (origin.kind !== point.kind) return undefined;
    const days = dayDelta(origin.date, point.date);
    const minutes =
        origin.kind === "time" && point.kind === "time"
            ? minutesBetweenPoints(origin, point, days, timeZone)
            : 0;
    if (days === 0 && minutes === 0) return undefined;
    return shiftedEdge(
        edge === "start" ? occurrence.start : occurrence.end,
        occurrence.allDay,
        days,
        minutes,
        timeZone,
    );
}

/** Resizing events by their handles and by keyboard, previewed as engine view state (D14). */
export function resize(): ResizeFeature {
    return defineFeature({
        name: "resize",
        engine: (host) => {
            const session = dragSessionOf(host);
            session.resizes = true;
            return {
                dragsEvents: true,
                get: {
                    "resize-preview": () =>
                        session.preview?.kind === "resize"
                            ? session.preview
                            : null,
                },
                is: {
                    "event-resizing": (payload) => {
                        const { occurrenceId } = (payload ?? {}) as {
                            occurrenceId?: unknown;
                        };
                        return (
                            session.activity?.kind === "resize" &&
                            session.activity.occurrenceId === occurrenceId
                        );
                    },
                },
                pointerdown: (_event, target): FeatureGesture | undefined => {
                    if (
                        target.kind !== "resize-handle" ||
                        target.occurrenceId === undefined ||
                        target.edge === undefined ||
                        target.point === null ||
                        session.activity !== null
                    ) {
                        return undefined;
                    }
                    const occurrence = host.occurrence(target.occurrenceId);
                    const edge = target.edge;
                    if (
                        !occurrence ||
                        !host.model.is(
                            edge === "start"
                                ? "event-start-editable"
                                : "event-duration-editable",
                            { eventId: occurrence.eventId },
                        )
                    ) {
                        return undefined;
                    }
                    const origin = target.point;
                    let started = false;
                    let moved = false;
                    let key = "";
                    const planAt = (clientX: number, clientY: number) => {
                        const point = host.pointAt(clientX, clientY);
                        const to =
                            point &&
                            edgeAt(
                                occurrence,
                                edge,
                                origin,
                                point,
                                host.timeZone(),
                            );
                        return {
                            point,
                            plan:
                                to === undefined || to === null
                                    ? undefined
                                    : {
                                          command: "event.resize" as const,
                                          payload: {
                                              eventId: occurrence.eventId,
                                              edge,
                                              to,
                                              ...session.target(occurrence),
                                          },
                                      },
                        };
                    };
                    const evaluate = (clientX: number, clientY: number) => {
                        const { point, plan } = planAt(clientX, clientY);
                        const next = point ? JSON.stringify(point) : "outside";
                        if (next === key) return;
                        key = next;
                        moved ||= plan !== undefined;
                        session.show(
                            !point
                                ? null
                                : plan
                                  ? session.evaluate(
                                        plan,
                                        "resize",
                                        false,
                                        occurrence.occurrenceId,
                                    )
                                  : session.still(occurrence, "resize", false),
                        );
                    };
                    return {
                        move: (event) => {
                            if (!started) {
                                started = true;
                                session.begin({
                                    kind: "resize",
                                    occurrenceId: occurrence.occurrenceId,
                                    keyboard: false,
                                });
                            }
                            evaluate(event.clientX, event.clientY);
                        },
                        end: (event) => {
                            evaluate(event.clientX, event.clientY);
                            const { plan } = planAt(
                                event.clientX,
                                event.clientY,
                            );
                            if (plan && session.preview) {
                                session.drop(plan, occurrence, "resize", false);
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
                    // without drag and drop, Space grabs for a resize alone
                    if (
                        session.moves ||
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
                        !host.model.is("event-duration-editable", {
                            eventId: occurrence.eventId,
                        })
                    ) {
                        return undefined;
                    }
                    return session.grab(occurrence);
                },
                attributes: (part, payload, into) => {
                    const activity = session.activity;
                    if (
                        (part !== "event" && part !== "resize-handle") ||
                        activity?.occurrenceId !== payload.occurrenceId
                    ) {
                        return;
                    }
                    if (activity?.kind === "resize") into["data-resizing"] = "";
                    else if (activity?.keyboard && !session.moves) {
                        into["data-grabbed"] = "";
                    }
                },
                detached: () => {
                    if (session.activity) session.finish();
                },
            };
        },
    });
}
