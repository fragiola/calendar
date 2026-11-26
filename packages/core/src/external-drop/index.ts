// `@fragiola/calendar/external-drop`: the `externalDrop()` feature (D14; requires
// `dragAndDrop()`). Things dragged in from outside the calendar become events: an app-driven
// pointer drag (another library's, `@fragiola/dnd` later) through the engine actions
// `external-drag-start` (an event draft), `external-drag-move` (client coordinates) and
// `external-drag-end`, previewed like a drag (`engine.get("drag-preview")`, `model.can` per target);
// and native HTML5 drops of foreign content (files, text, links), which the app's `draft` turns into
// an event or leaves to the app (`external-drop` engine event). A drop runs one `event.add`.
import { fail, ok } from "../commands/define";
import { dragSessionOf } from "../drop-target/drag-session";
import type { GridPoint } from "../engine/grid-point";
import type { ExternalEventDraft } from "../engine/verbs";
import { defineFeature } from "../features/define-feature";
import type { CalendarFeature } from "../features/types";
import { addDays } from "../time/add-days";
import { formatPlainDate } from "../time/format-plain-date";
import type { Instant } from "../time/instant";
import { parseDateTime } from "../time/parse-date-time";
import { parsePlainDate } from "../time/parse-plain-date";
import { formatInstant } from "../time-zone/format-instant";

export type { DragPreview } from "../engine/preview";
export type { ExternalEventDraft } from "../engine/verbs";

/** Options of {@link externalDrop}. */
export interface ExternalDropOptions {
    /**
     * whether a native drag's content may drop here, from its `DataTransfer.types` (`"Files"`,
     * `"text/plain"`, `"text/uri-list"`); default any
     */
    accept?: ((types: readonly string[]) => boolean) | undefined;
    /**
     * the event a native drop adds, from its `DataTransfer` and the point it was dropped at, or
     * `null` to leave the drop to the app (the `external-drop` engine event carries it); default
     * none: every native drop is the app's
     */
    draft?:
        | ((
              dataTransfer: DataTransfer,
              point: GridPoint,
          ) => ExternalEventDraft | null)
        | undefined;
}

/** The external drop feature, as `createCalendarModel`'s `features` takes it. */
export type ExternalDropFeature = CalendarFeature<"external-drop">;

/** `event.add`'s payload for a draft dropped at a point: the target gives its times (D10). */
function addPayload(
    draft: ExternalEventDraft,
    point: GridPoint,
    settings: { defaultTimedDuration: number; defaultAllDayDuration: number },
    timeZone: string,
): Record<string, unknown> | undefined {
    const { duration, ...fields } = draft;
    if (point.kind === "day") {
        const date = parsePlainDate(point.date);
        if (!date.ok) return undefined;
        const days = duration?.days ?? settings.defaultAllDayDuration;
        return {
            ...fields,
            start: point.date,
            end: formatPlainDate(addDays(date.value, days)),
            allDay: true,
        };
    }
    const at = parseDateTime(point.at);
    if (!at.ok) return undefined;
    const minutes = duration?.minutes ?? settings.defaultTimedDuration;
    return {
        ...fields,
        start: point.at,
        end: formatInstant(
            (at.value.instant + minutes * 60_000) as Instant,
            timeZone,
        ),
        allDay: false,
    };
}

/** Drops from outside the calendar: app-driven pointer drags and native drops (D14). */
export function externalDrop(
    options: ExternalDropOptions = {},
): ExternalDropFeature {
    return defineFeature({
        name: "external-drop",
        requires: ["drag-and-drop"],
        engine: (host) => {
            const session = dragSessionOf(host);
            let draft: ExternalEventDraft | null = null;
            let point: GridPoint | null = null;
            let nativeKey = "";
            const payloadAt = (at: GridPoint | null, from = draft) =>
                at && from
                    ? addPayload(from, at, host.settings(), host.timeZone())
                    : undefined;
            const previewAt = (at: GridPoint | null, from = draft) => {
                const payload = payloadAt(at, from);
                if (!payload || !host.model.can("event.add", payload)) {
                    return null;
                }
                return session.previewOf(
                    {
                        eventId: null,
                        occurrenceId: null,
                        start: String(payload.start),
                        end: String(payload.end),
                        allDay: payload.allDay === true,
                    },
                    "external",
                    false,
                );
            };
            const add = (payload: Record<string, unknown>) => {
                const result = host.model.run("event.add", payload);
                return result.ok
                    ? (result.value as { eventId: string }).eventId
                    : null;
            };
            const stop = () => {
                draft = null;
                point = null;
                if (session.activity?.kind === "external") session.finish();
            };
            const typesOf = (event: DragEvent) => [
                ...(event.dataTransfer?.types ?? []),
            ];
            return {
                run: {
                    "external-drag-start": (payload, dryRun) => {
                        const { event } = (payload ?? {}) as {
                            event?: unknown;
                        };
                        if (typeof event !== "object" || event === null) {
                            return fail(
                                "invalid_payload",
                                "must be an event draft",
                                "/event",
                            );
                        }
                        if (
                            session.activity !== null &&
                            session.activity.kind !== "external"
                        ) {
                            return fail("refused", "another drag is under way");
                        }
                        if (!dryRun) {
                            draft = event as ExternalEventDraft;
                            point = null;
                            session.begin({
                                kind: "external",
                                occurrenceId: null,
                                keyboard: false,
                            });
                        }
                        return ok({});
                    },
                    "external-drag-move": (payload, dryRun) => {
                        const { clientX, clientY } = (payload ?? {}) as {
                            clientX?: unknown;
                            clientY?: unknown;
                        };
                        if (
                            typeof clientX !== "number" ||
                            typeof clientY !== "number"
                        ) {
                            return fail(
                                "invalid_payload",
                                "give clientX and clientY",
                                "",
                            );
                        }
                        if (!draft) {
                            return fail(
                                "refused",
                                "no outside drag is under way",
                            );
                        }
                        const at = host.pointAt(clientX, clientY);
                        if (!dryRun) {
                            point = at;
                            session.show(previewAt(at));
                        }
                        return ok({ point: at });
                    },
                    "external-drag-end": (payload, dryRun) => {
                        const { cancel } = (payload ?? {}) as {
                            cancel?: unknown;
                        };
                        if (!draft) {
                            return fail(
                                "refused",
                                "no outside drag is under way",
                            );
                        }
                        const at = point;
                        const body = payloadAt(at);
                        const allowed =
                            cancel !== true &&
                            body !== undefined &&
                            session.preview !== null &&
                            host.model.can("event.add", body);
                        if (dryRun) {
                            return ok({ eventId: null });
                        }
                        stop();
                        const eventId = allowed && body ? add(body) : null;
                        if (eventId !== null && at) {
                            host.emit({
                                type: "external-drop",
                                eventId,
                                point: at,
                                types: [],
                            });
                        } else {
                            host.emit({
                                type: "announce",
                                announcement: {
                                    kind: "drag-cancel",
                                    occurrenceId: null,
                                },
                            });
                        }
                        return ok({ eventId });
                    },
                },
                nativeDrag: (event) => {
                    if (event.type === "dragend") {
                        // a native drag that ended elsewhere (no drop, no dragleave)
                        nativeKey = "";
                        if (session.activity?.kind === "external" && !draft) {
                            session.finish();
                        }
                        return undefined;
                    }
                    const types = typesOf(event);
                    if (options.accept && !options.accept(types))
                        return undefined;
                    const at = host.pointAt(event.clientX, event.clientY);
                    if (event.type === "dragleave") {
                        const next = event.relatedTarget as Node | null;
                        if (!next || !host.root()?.contains(next)) {
                            nativeKey = "";
                            if (
                                session.activity?.kind === "external" &&
                                !draft
                            ) {
                                session.finish();
                            }
                        }
                        return undefined;
                    }
                    if (event.type === "drop") {
                        nativeKey = "";
                        if (session.activity?.kind === "external" && !draft) {
                            session.finish();
                        }
                        if (!at) return undefined;
                        const made =
                            event.dataTransfer && options.draft
                                ? options.draft(event.dataTransfer, at)
                                : null;
                        const body = made ? payloadAt(at, made) : undefined;
                        const eventId =
                            body && host.model.can("event.add", body)
                                ? add(body)
                                : null;
                        host.emit({
                            type: "external-drop",
                            eventId,
                            point: at,
                            types,
                            ...(eventId === null && event.dataTransfer
                                ? { dataTransfer: event.dataTransfer }
                                : {}),
                        });
                        return true;
                    }
                    // dragenter / dragover: a target the drop may land on
                    if (!at) return undefined;
                    if (!draft && session.activity === null) {
                        session.begin({
                            kind: "external",
                            occurrenceId: null,
                            keyboard: false,
                        });
                    }
                    const key = JSON.stringify(at);
                    if (key !== nativeKey && !draft) {
                        nativeKey = key;
                        // the content is unreadable until the drop: the target alone shows
                        session.show(null);
                    }
                    return true;
                },
                detached: stop,
            };
        },
    });
}
