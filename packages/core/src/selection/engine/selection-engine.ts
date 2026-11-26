// The selection's part of an engine (D13, D14): a press on a day or a slot selects from there to
// where the pointer is (past `selectMinDistance`; a touch after its long press), Shift + arrows
// from the focused cell grow the range and Enter confirms it. While it goes, the range is engine
// view state (`engine.get("selection-preview")`, `data-selected`), `model.can("selection.set")`
// answering each one (a refused range shows nothing); the release or Enter runs one
// `selection.set` and tells the app (`select`). The range shown is laid out like an event
// (`engine.get("selection-segments")`), so an adapter draws its highlight as it draws a segment.
import type { CellPosition, GridPoint } from "../../engine/grid-point";
import { timePoint } from "../../engine/hit-test";
import type { PreviewSegments } from "../../engine/preview";
import type {
    FeatureEngine,
    FeatureEngineHost,
    FeatureGesture,
} from "../../features/engine-types";
import type { SelectionRange } from "../../features/types";
import { addDays } from "../../time/add-days";
import { formatPlainDate } from "../../time/format-plain-date";
import type { Instant } from "../../time/instant";
import { parseDateTime } from "../../time/parse-date-time";
import { parsePlainDate } from "../../time/parse-plain-date";
import { formatInstant } from "../../time-zone/format-instant";
import { coversDay, coversSlot } from "../state/selection-range";

const ARROWS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

/** The range of days between two dates, both included. */
function dayRange(a: string, b: string): SelectionRange | null {
    const [first, last] = a <= b ? [a, b] : [b, a];
    const end = parsePlainDate(last);
    return end.ok
        ? {
              start: first,
              end: formatPlainDate(addDays(end.value, 1)),
              allDay: true,
          }
        : null;
}

/** The range of time between two instants' starts, the later one's step included. */
function timeRange(
    a: string,
    b: string,
    step: number,
    timeZone: string,
): SelectionRange | null {
    const x = parseDateTime(a);
    const y = parseDateTime(b);
    if (!x.ok || !y.ok) return null;
    const first = Math.min(x.value.instant, y.value.instant);
    const last = Math.max(x.value.instant, y.value.instant);
    return {
        start: formatInstant(first as Instant, timeZone),
        end: formatInstant((last + step * 60_000) as Instant, timeZone),
        allDay: false,
    };
}

/** The selection's engine part. */
export function selectionEngine(
    host: FeatureEngineHost,
    minDistance: number,
): FeatureEngine {
    let pending: SelectionRange | null = null;
    let anchor: CellPosition | null = null;
    const show = (range: SelectionRange | null) => {
        if (range === pending) return;
        pending = range;
        host.changed();
    };
    const allowed = (range: SelectionRange | null) =>
        range && host.model.can("selection.set", range) ? range : null;
    const between = (a: GridPoint, b: GridPoint): SelectionRange | null => {
        if (a.kind === "day" && b.kind === "day")
            return dayRange(a.date, b.date);
        if (a.kind === "time" && b.kind === "time") {
            return timeRange(a.at, b.at, host.snapDuration(), host.timeZone());
        }
        return null;
    };
    const cellPoint = (cell: CellPosition): GridPoint | null => {
        if (cell.kind === "day") return { kind: "day", date: cell.date };
        const match = /^(\d{2}):(\d{2})$/.exec(cell.time);
        return match
            ? timePoint(
                  cell.date,
                  Number(match[1]) * 60 + Number(match[2]),
                  host.timeZone(),
              )
            : null;
    };
    const confirm = (keyboard: boolean) => {
        const range = pending;
        anchor = null;
        show(null);
        if (!range) return;
        const result = host.model.run("selection.set", range);
        if (result.ok) host.emit({ type: "select", range, keyboard });
    };
    // the segments of the range shown (the pending one, else the selected one), kept per range
    let laidOut: { range: object; segments: PreviewSegments } | null = null;
    const segments = (): PreviewSegments | null => {
        const range =
            pending ??
            (host.model.get("selected-range") as SelectionRange | null);
        if (!range) return null;
        if (laidOut?.range !== range) {
            laidOut = {
                range,
                segments: host.previewSegments({
                    eventId: null,
                    occurrenceId: null,
                    ...range,
                }),
            };
        }
        return laidOut.segments;
    };
    return {
        get: {
            "selection-preview": () => pending,
            "selection-segments": segments,
        },
        pointerdown: (_event, target): FeatureGesture | undefined => {
            if (
                (target.kind !== "day" &&
                    target.kind !== "slot" &&
                    target.kind !== "column") ||
                target.point === null
            ) {
                return undefined;
            }
            const origin = target.point;
            const single = between(origin, origin);
            let grew = false;
            const move = (event: PointerEvent) => {
                const point = host.pointAt(event.clientX, event.clientY);
                if (!point || point.kind !== origin.kind) return;
                const range = between(origin, point);
                grew ||=
                    range !== null &&
                    (range.start !== single?.start ||
                        range.end !== single?.end);
                show(allowed(range));
            };
            return {
                threshold: minDistance,
                move,
                end: (event) => {
                    move(event);
                    confirm(false);
                },
                cancel: () => show(null),
                active: () => grew,
            };
        },
        keydown: (event, target) => {
            if (!target || target.kind === "event") return undefined;
            if (event.key === "Escape") {
                if (pending || anchor) {
                    anchor = null;
                    show(null);
                    return true;
                }
                if (host.model.get("selected-range") !== null) {
                    host.model.run("selection.clear", {});
                    return true;
                }
                return undefined;
            }
            if (event.key === "Enter" && pending) {
                confirm(true);
                return true;
            }
            if (!event.shiftKey || !ARROWS.has(event.key)) {
                if (anchor && event.key !== "Shift") {
                    anchor = null;
                    show(null);
                }
                return undefined;
            }
            if (event.ctrlKey || event.altKey || event.metaKey)
                return undefined;
            anchor ??= target;
            const next = host.keyTarget(target, {
                key: event.key,
                shiftKey: false,
                ctrlKey: false,
                altKey: false,
                metaKey: false,
            } as KeyboardEvent);
            if (
                !next ||
                "step" in next ||
                next.navigate ||
                next.cell.kind !== anchor.kind
            ) {
                return true;
            }
            host.focus(next.cell);
            const from = cellPoint(anchor);
            const to = cellPoint(next.cell);
            const range =
                from && to
                    ? from.kind === "time" && to.kind === "time"
                        ? timeRange(
                              from.at,
                              to.at,
                              host.settings().slotDuration,
                              host.timeZone(),
                          )
                        : between(from, to)
                    : null;
            const shown = allowed(range);
            show(shown);
            host.emit({
                type: "announce",
                announcement: { kind: "select-extend", range: shown },
            });
            return true;
        },
        attributes: (part, payload, into) => {
            if (!pending) return;
            if (part === "day" && typeof payload.date === "string") {
                into["data-selected"] = coversDay(pending, payload.date)
                    ? ""
                    : undefined;
            } else if (
                part === "slot" &&
                typeof payload.date === "string" &&
                typeof payload.time === "string"
            ) {
                into["data-selected"] = coversSlot(
                    pending,
                    payload.date,
                    payload.time,
                    host.timeZone(),
                )
                    ? ""
                    : undefined;
            }
        },
        detached: () => {
            anchor = null;
            show(null);
        },
    };
}
