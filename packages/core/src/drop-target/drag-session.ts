// One engine's drag session: what the drag features share of it (Tree's pattern, fragiola/tree,
// packages/core/src/drop-target/session.ts, same author and licence). The first drag feature of an
// engine creates it (`dragSessionOf`, through the engine's `shared` slot) and the others find it
// there, so drag and drop, resize and external drops show one preview at a time and a keyboard
// grab moves and resizes together, without importing each other. A preview is engine view state
// (D14): `model.check` answers each target, and only a drop runs a command, once.
import type {
    CommandName,
    EditScope,
    EventTimesResult,
} from "../commands/types";
import type { DragPreview, PreviewTimes } from "../engine/preview";
import type {
    FeatureEngineHost,
    FeatureGesture,
} from "../features/engine-types";
import type { Occurrence } from "../layout/occurrence";
import { isStill, type MoveRequest, shiftedEdge } from "./move-target";

/** What is being dragged now. */
export interface DragActivity {
    readonly kind: DragPreview["kind"];
    readonly occurrenceId: string | null;
    readonly keyboard: boolean;
}

/** A command a drop would run. */
export interface DropPlan {
    readonly command: CommandName;
    readonly payload: object;
}

export class DragSession {
    readonly host: FeatureEngineHost;
    /** the dragged occurrence where it would land (`null`: no drag, or a refused target) */
    preview: DragPreview | null = null;
    activity: DragActivity | null = null;
    /** drag and drop installed: a grab's arrows move */
    moves = false;
    /** resize installed: a grab's Shift + arrows resize */
    resizes = false;
    /** the scope a drop of a recurring occurrence runs with (`dragAndDrop({ recurringScope })`) */
    recurringScope: EditScope = "this";

    constructor(host: FeatureEngineHost) {
        this.host = host;
    }

    /** A drag starts: nothing previewed yet. */
    begin(activity: DragActivity): void {
        this.activity = activity;
        this.preview = null;
        this.host.changed();
    }

    /** Shows (or, `null`, hides) the preview, telling the app's live region when it changed. */
    show(preview: DragPreview | null): void {
        const before = this.preview;
        this.preview = preview;
        const same =
            before === preview ||
            (before !== null &&
                preview !== null &&
                before.start === preview.start &&
                before.end === preview.end &&
                before.allDay === preview.allDay);
        if (same) return;
        this.host.changed();
        this.host.emit({
            type: "announce",
            announcement: {
                kind: "drag-over",
                occurrenceId: this.activity?.occurrenceId ?? null,
                preview: preview && timesOf(preview),
            },
        });
    }

    /** The drag is over. */
    finish(): void {
        this.activity = null;
        this.preview = null;
        this.host.changed();
    }

    /** Ends the drag with nothing committed, telling the app's live region. */
    cancelled(): void {
        const occurrenceId = this.activity?.occurrenceId ?? null;
        this.finish();
        this.host.emit({
            type: "announce",
            announcement: { kind: "drag-cancel", occurrenceId },
        });
    }

    /** The occurrence and the scope an edit names (only with `recurrence()`, D15). */
    target(occurrence: Occurrence): object {
        return this.host.installed("recurrence")
            ? {
                  occurrenceId: occurrence.occurrenceId,
                  scope: this.recurringScope,
              }
            : {};
    }

    /** A preview of times, laid out in the current view. */
    previewOf(
        times: PreviewTimes,
        kind: DragPreview["kind"],
        keyboard: boolean,
    ): DragPreview {
        return Object.freeze({
            kind,
            keyboard,
            ...timesOf(times),
            ...this.host.previewSegments(times),
        });
    }

    /** The preview of a plan: what `model.check` says it would give, or `null` when refused. */
    evaluate(
        plan: DropPlan,
        kind: DragPreview["kind"],
        keyboard: boolean,
        occurrenceId: string | null,
    ): DragPreview | null {
        const result = this.host.model.check(plan.command, plan.payload);
        if (!result.ok) return null;
        const times = timesFromResult(plan.command, result.value);
        return times
            ? this.previewOf({ ...times, occurrenceId }, kind, keyboard)
            : null;
    }

    /** The preview of an occurrence where it is (a drag back to its start). */
    still(
        occurrence: Occurrence,
        kind: DragPreview["kind"],
        keyboard: boolean,
    ): DragPreview {
        return this.previewOf(
            {
                eventId: occurrence.eventId,
                occurrenceId: occurrence.occurrenceId,
                start: occurrence.start,
                end: occurrence.end,
                allDay: occurrence.allDay,
            },
            kind,
            keyboard,
        );
    }

    /**
     * Runs a drop's plan (one command), tells the app (`drop`, an announcement) and moves focus
     * with the occurrence when it was focused. Whether it ran.
     */
    drop(
        plan: DropPlan,
        occurrence: Occurrence,
        kind: "move" | "resize",
        keyboard: boolean,
    ): boolean {
        const preview = this.preview;
        const result = this.host.model.run(plan.command, plan.payload);
        this.finish();
        const times = result.ok
            ? timesFromResult(plan.command, result.value)
            : undefined;
        if (!times) return false;
        this.host.emit({
            type: "drop",
            kind,
            eventId: occurrence.eventId,
            occurrenceId: occurrence.occurrenceId,
            start: times.start,
            end: times.end,
            allDay: times.allDay,
            keyboard,
        });
        if (preview) {
            this.host.emit({
                type: "announce",
                announcement: {
                    kind: "drop",
                    occurrenceId: occurrence.occurrenceId,
                    preview: timesOf(preview),
                },
            });
        }
        const focused = this.host.focused();
        if (
            keyboard ||
            (focused?.kind === "event" &&
                focused.occurrenceId === occurrence.occurrenceId)
        ) {
            const moved =
                this.host.occurrence(occurrence.occurrenceId) ??
                this.host.occurrence(occurrence.eventId);
            const cell = moved && this.host.cellOf(moved);
            if (moved && cell) {
                this.host.focus({
                    kind: "event",
                    occurrenceId: moved.occurrenceId,
                    cell,
                });
            }
        }
        return true;
    }

    /** The plan of a move to a target, or `undefined` for a move that changes nothing. */
    movePlan(
        occurrence: Occurrence,
        request: MoveRequest,
    ): DropPlan | undefined {
        if (isStill(request)) return undefined;
        return {
            command: "event.move",
            payload: {
                eventId: occurrence.eventId,
                ...request,
                ...this.target(occurrence),
            },
        };
    }

    /**
     * A keyboard grab of an occurrence (D13): its arrows move it (drag and drop) by a day or a
     * snap step, Shift + arrows move its end (resize), Enter drops it (one command, as a pointer
     * drop), Escape cancels it (the engine's), Tab leaves it.
     */
    grab(occurrence: Occurrence): FeatureGesture {
        const host = this.host;
        const step = { days: 0, minutes: 0, endDays: 0, endMinutes: 0 };
        let done = false;
        this.begin({
            kind: "move",
            occurrenceId: occurrence.occurrenceId,
            keyboard: true,
        });
        this.preview = this.still(occurrence, "move", true);
        host.emit({
            type: "announce",
            announcement: {
                kind: "grab",
                occurrenceId: occurrence.occurrenceId,
            },
        });
        const timeGrid =
            !occurrence.allDay && host.model.state.view.type !== "month";
        const plan = (): DropPlan | undefined | null => {
            const move = this.movePlan(occurrence, {
                delta: {
                    ...(step.days === 0 ? {} : { days: step.days }),
                    ...(step.minutes === 0 ? {} : { minutes: step.minutes }),
                },
            });
            if (step.endDays === 0 && step.endMinutes === 0) return move;
            let end = occurrence.end;
            if (move) {
                const moved = host.model.check(move.command, move.payload);
                if (!moved.ok) return null;
                end = (moved.value as EventTimesResult).end;
            }
            const to = shiftedEdge(
                end,
                occurrence.allDay,
                step.endDays,
                step.endMinutes,
                host.timeZone(),
            );
            if (to === undefined) return null;
            const resize = {
                command: "event.resize" as const,
                payload: {
                    eventId: occurrence.eventId,
                    edge: "end",
                    to,
                    ...this.target(occurrence),
                },
            };
            return move
                ? {
                      command: "batch",
                      payload: {
                          commands: [
                              { command: move.command, payload: move.payload },
                              {
                                  command: resize.command,
                                  payload: resize.payload,
                              },
                          ],
                      },
                  }
                : resize;
        };
        const update = () => {
            const next = plan();
            // a grab that only moved its end previews as a resize
            const kind = next?.command === "event.resize" ? "resize" : "move";
            this.show(
                next === undefined
                    ? this.still(occurrence, kind, true)
                    : next === null
                      ? null
                      : this.evaluate(
                            next,
                            kind,
                            true,
                            occurrence.occurrenceId,
                        ),
            );
        };
        const end = () => {
            done = true;
        };
        return {
            move: () => {},
            end: () => {},
            cancel: () => {
                if (done) return;
                end();
                this.cancelled();
            },
            active: () => !done,
            keydown: (event) => {
                if (done) return false;
                const rtl = host.direction() === "rtl";
                const inline = (forward: boolean) => (forward !== rtl ? 1 : -1);
                const snap = host.snapDuration();
                if (event.ctrlKey || event.altKey || event.metaKey)
                    return false;
                switch (event.key) {
                    case "ArrowLeft":
                    case "ArrowRight": {
                        const by = inline(event.key === "ArrowRight");
                        if (event.shiftKey) {
                            if (!this.resizes || timeGrid) return true;
                            step.endDays += by;
                        } else {
                            if (!this.moves) return true;
                            step.days += by;
                        }
                        update();
                        return true;
                    }
                    case "ArrowUp":
                    case "ArrowDown": {
                        const by = event.key === "ArrowDown" ? 1 : -1;
                        if (event.shiftKey) {
                            if (!this.resizes || !timeGrid) return true;
                            step.endMinutes += by * snap;
                        } else if (!this.moves) {
                            return true;
                        } else if (timeGrid) {
                            step.minutes += by * snap;
                        } else if (host.model.state.view.type === "month") {
                            step.days += by * 7;
                        } else {
                            return true;
                        }
                        update();
                        return true;
                    }
                    case "Enter": {
                        const next = plan();
                        end();
                        if (next && this.preview) {
                            const kind =
                                next.command === "event.resize"
                                    ? "resize"
                                    : "move";
                            this.drop(next, occurrence, kind, true);
                        } else {
                            this.cancelled();
                        }
                        return true;
                    }
                    case " ":
                        return true;
                    case "Tab":
                        end();
                        this.cancelled();
                        return false;
                    default:
                        return false;
                }
            },
        };
    }
}

function timesOf(preview: PreviewTimes): PreviewTimes {
    return {
        eventId: preview.eventId,
        occurrenceId: preview.occurrenceId,
        start: preview.start,
        end: preview.end,
        allDay: preview.allDay,
    };
}

/** The new times a command's result gives (a batch's: its last step's). */
function timesFromResult(
    command: string,
    value: unknown,
): EventTimesResult | undefined {
    const last =
        command === "batch"
            ? (value as { results: readonly unknown[] }).results.at(-1)
            : value;
    const times = last as Partial<EventTimesResult> | undefined;
    return times &&
        typeof times.start === "string" &&
        typeof times.end === "string" &&
        typeof times.allDay === "boolean"
        ? (times as EventTimesResult)
        : undefined;
}

/** The engine's drag session, made by the first drag feature that asks. */
export function dragSessionOf(host: FeatureEngineHost): DragSession {
    return host.shared("drag-session", () => new DragSession(host));
}
