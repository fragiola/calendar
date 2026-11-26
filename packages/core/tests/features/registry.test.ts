// The feature registry (`architecture/features.md`): requirements and duplicates fail at creation
// naming both; a feature's commands and keys join the bus; its document fields load and write
// back; the occurrences contribution point feeds every layout; an edit of an occurrence goes
// through the feature's target and write (D15's hooks for `recurrence()`); its event rules refuse
// commands, with `can` / `check` agreeing; its state is kept after each command.
import { describe, expect, it } from "vitest";
import { featuresOf } from "../../src/features/registry";
import {
    type CalendarEvent,
    type CommandResult,
    createCalendarModel,
    defineFeature,
    type Occurrence,
} from "../../src/index";
import { allDay, documentOf, modelOf, NOW } from "../fixture";

/** A planted recurrence: an event with a `recurrence` repeats daily (`FREQ=DAILY` only). */
const daily = defineFeature({
    name: "recurrence",
    occurrences: (_state, event, within) => {
        if (event.recurrence === undefined) return undefined;
        const start = Number(event.start.slice(8, 10));
        const days: Occurrence[] = [];
        for (let day = start; day < start + 3; day++) {
            const date = `2026-11-${String(day).padStart(2, "0")}`;
            const end = `2026-11-${String(day + 1).padStart(2, "0")}`;
            days.push({
                occurrenceId: `${event.id}@${date}`,
                eventId: event.id,
                start: date,
                end,
                allDay: true,
            });
        }
        expect(within.timeZone).toBe("UTC");
        return days;
    },
    editTarget: (state, edit) => {
        if (edit.event.recurrence === undefined) return undefined;
        if (edit.scope === undefined) {
            return {
                ok: false,
                error: {
                    code: "invalid_payload",
                    message: "scope is required",
                    path: "/scope",
                },
            };
        }
        const date = edit.occurrenceId?.split("@")[1] ?? "";
        const end = `2026-11-${String(Number(date.slice(8, 10)) + 1).padStart(2, "0")}`;
        expect(state.events).toContain(edit.event);
        return {
            occurrenceId: edit.occurrenceId ?? "",
            eventId: edit.event.id,
            start: date,
            end,
            allDay: true,
        };
    },
    writeEdit: (draft, edit): CommandResult<unknown> | undefined => {
        if (
            edit.event.recurrence === undefined ||
            edit.occurrenceId === undefined
        )
            return undefined;
        const overrides = { ...edit.event.recurrence.overrides };
        overrides[edit.occurrence.start] =
            edit.next === null ? { removed: true } : { start: edit.next.start };
        draft.putEvent({
            ...edit.event,
            recurrence: { ...edit.event.recurrence, overrides },
        } as CalendarEvent);
        return { ok: true, value: {} };
    },
});

const recurring = [
    allDay("r", "2026-11-24", "2026-11-25", {
        recurrence: { rule: "FREQ=DAILY" },
    }),
];

describe("composing features", () => {
    it("throws for a missing requirement, naming both", () => {
        const external = defineFeature({
            name: "external-drop",
            requires: ["drag-and-drop"],
        });
        expect(() => modelOf([], {}, {}, { features: [external] })).toThrow(
            'feature "external-drop" requires feature "drag-and-drop": install it too',
        );
        const drag = defineFeature({ name: "drag-and-drop" });
        expect(() =>
            modelOf([], {}, {}, { features: [external, drag] }),
        ).not.toThrow();
    });

    it("throws for a feature installed twice, or two adding one key", () => {
        const one = defineFeature({ name: "selection" });
        expect(() => modelOf([], {}, {}, { features: [one, one] })).toThrow(
            'feature "selection" is installed twice',
        );
        const a = defineFeature({
            name: "resize",
            get: { "shared-key": () => 1 },
        });
        const b = defineFeature({
            name: "selection",
            get: { "shared-key": () => 2 },
        });
        expect(() => modelOf([], {}, {}, { features: [a, b] })).toThrow(
            'adds get key "shared-key"',
        );
    });

    it("keeps the composition off the model's surface, and lists the features", () => {
        const model = modelOf([], {}, {}, { features: [daily] });
        expect(featuresOf(model).list).toEqual([daily]);
        expect(featuresOf({}).list).toEqual([]);
        expect(model.get("features")).toEqual([
            { name: "recurrence", requires: [] },
        ]);
    });
});

describe("what a feature contributes", () => {
    it("adds commands to the bus, through the middleware, listed with the core's", () => {
        const sources = defineFeature({
            name: "event-sources",
            load: () => ({ loading: false }),
            toJson: () => ({}),
            commands: [
                {
                    name: "sources.loading" as never,
                    description: "Mark the sources loading.",
                    payloadSchema: {
                        type: "object",
                        properties: { loading: { type: "boolean" } },
                        required: ["loading"],
                        additionalProperties: false,
                    },
                    resultSchema: { type: "object" },
                    transient: false,
                    reduce: ((
                        payload: { loading: boolean },
                        { draft }: { draft: { set(patch: object): void } },
                    ) => {
                        draft.set({ loading: payload.loading });
                        return { ok: true, value: {} };
                    }) as never,
                },
            ],
            get: { "sources-loading": (state) => state.loading },
            is: { loading: (state) => state.loading === true },
        });
        const model = modelOf([], {}, {}, { features: [sources] });
        const seen: string[] = [];
        model.use((ctx, next) => {
            seen.push(ctx.command);
            return next();
        });
        const run = model.run as (
            command: string,
            payload: unknown,
        ) => CommandResult<unknown>;
        const get = model.get as (key: string) => unknown;
        const is = model.is as (key: string) => boolean;
        expect(get("sources-loading")).toBe(false);
        expect(run("sources.loading", { loading: true }).ok).toBe(true);
        expect(run("sources.loading", { loading: 1 })).toMatchObject({
            error: { code: "invalid_payload" },
        });
        expect(is("loading")).toBe(true);
        // a malformed payload is refused before the middleware
        expect(seen).toEqual(["sources.loading"]);
        expect(model.get("commands").at(-1)?.name).toBe("sources.loading");
        expect(
            model.dispatch({
                command: "sources.loading",
                payload: { loading: false },
            }).ok,
        ).toBe(true);
    });

    it("gives its settings' defaults, loads its state and keeps it after each command", () => {
        let kept = 0;
        const feature = defineFeature({
            name: "constraints",
            settings: { slotDuration: 20 },
            load: (_json, state) => ({ eventCount: state.events.length }),
            stateChanged: (draft) => {
                kept++;
                draft.set({ eventCount: draft.state.events.length });
            },
        });
        const model = modelOf(
            [allDay("a", "2026-11-24", "2026-11-25")],
            {},
            {},
            { features: [feature] },
        );
        expect(model.state.settings.slotDuration).toBe(20);
        expect(
            (model.state as unknown as { eventCount: number }).eventCount,
        ).toBe(1);
        model.run("event.remove", { eventId: "a" });
        expect(
            (model.state as unknown as { eventCount: number }).eventCount,
        ).toBe(0);
        model.run("event.remove", { eventId: "a" });
        // a failed command keeps nothing
        expect(kept).toBe(1);
    });

    it("refuses an event change its rules forbid, and can / check agree", () => {
        const noWeekends = defineFeature({
            name: "constraints",
            checkEvent: (_state, change) =>
                change.after?.start === "2026-11-28"
                    ? {
                          ok: false,
                          error: {
                              code: "refused",
                              message: "not on Saturdays",
                              path: "/start",
                          },
                      }
                    : undefined,
        });
        const model = modelOf(
            [allDay("a", "2026-11-24", "2026-11-25")],
            {},
            {},
            { features: [noWeekends] },
        );
        const move = { eventId: "a", start: "2026-11-28" };
        const refused = {
            ok: false,
            error: {
                code: "refused",
                message: "not on Saturdays",
                path: "/start",
            },
        };
        expect(model.check("event.move", move)).toEqual(refused);
        expect(model.can("event.move", move)).toBe(false);
        expect(model.run("event.move", move)).toEqual(refused);
        expect(
            model.run("event.add", {
                title: "x",
                start: "2026-11-28",
                allDay: true,
            }),
        ).toEqual(refused);
        expect(
            model.can("event.move", { eventId: "a", start: "2026-11-27" }),
        ).toBe(true);
    });
});

describe("the occurrences contribution point", () => {
    it("feeds the layouts the feature's occurrences, the core keeping its own for others", () => {
        const model = modelOf(
            [...recurring, allDay("plain", "2026-11-25", "2026-11-26")],
            {},
            { view: { type: "month", anchorDate: "2026-11-26" } },
            { features: [daily] },
        );
        expect(
            model
                .get("occurrences")
                .map((occurrence) => occurrence.occurrenceId),
        ).toEqual(["r@2026-11-24", "r@2026-11-25", "r@2026-11-26", "plain"]);
        // by lane, then column
        expect(
            model
                .get("day-grid")
                ?.weeks[3]?.segments.map((segment) => segment.occurrenceId),
        ).toEqual(["r@2026-11-24", "plain", "r@2026-11-26", "r@2026-11-25"]);
        expect(
            model.get("event-attributes-by", {
                occurrenceId: "r@2026-11-25",
            })?.["data-event-id"],
        ).toBe("r");
    });
});

describe("an edit of an occurrence", () => {
    const model = () =>
        createCalendarModel(documentOf(recurring), {
            features: [daily],
            now: () => NOW,
        });

    it("starts from the feature's occurrence and is written its way", () => {
        const calendar = model();
        expect(
            calendar.run("event.move", {
                eventId: "r",
                occurrenceId: "r@2026-11-25",
                scope: "this",
                delta: { days: 2 },
            }),
        ).toEqual({
            ok: true,
            value: {
                eventId: "r",
                start: "2026-11-27",
                end: "2026-11-28",
                allDay: true,
            },
        });
        expect(
            calendar.get("event-by", { id: "r" })?.recurrence?.overrides,
        ).toEqual({
            "2026-11-25": { start: "2026-11-27" },
        });
        // the series itself did not move
        expect(calendar.get("event-by", { id: "r" })?.start).toBe("2026-11-24");
    });

    it("passes on the feature's refusal", () => {
        expect(
            model().run("event.remove", {
                eventId: "r",
                occurrenceId: "r@2026-11-25",
            }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/scope" },
        });
    });

    it("refuses an occurrence of an event the feature leaves to the core", () => {
        const calendar = createCalendarModel(
            documentOf([allDay("plain", "2026-11-25", "2026-11-26")]),
            {
                features: [daily],
                now: () => NOW,
            },
        );
        expect(
            calendar.run("event.remove", {
                eventId: "plain",
                occurrenceId: "plain@x",
            }),
        ).toMatchObject({
            error: { code: "not_found", path: "/occurrenceId" },
        });
        expect(
            calendar.run("event.remove", {
                eventId: "plain",
                occurrenceId: "plain",
            }).ok,
        ).toBe(true);
    });
});
