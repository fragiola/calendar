// The view commands (D7): the view is model state, so an AI or a server navigates with no screen.
// `next` / `previous` step by the view's own step (`view-days.ts`); a step, a `go-to` or `today`
// that would leave `validRange` is refused, never clamped.
import type { CalendarSettings } from "../document/calendar-settings";
import {
    LIST_DURATION,
    PLAIN_DATE,
    VIEW,
    VIEW_DAYS,
    VIEW_TYPE,
} from "../schema/fragments";
import type { ViewState } from "../state/calendar-state";
import type { Draft } from "../state/draft";
import { fromEpochDay, toEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import { parsePlainDate } from "../time/parse-plain-date";
import { todayOf } from "../view/today";
import { isValidDay, touchesValid, validDays } from "../view/valid-days";
import { steppedAnchor, viewDays } from "../view/view-days";
import { defineCommand, type Failure, fail, ok } from "./define";
import { isWritable } from "./event-moves";
import type { ViewResult } from "./types";

const VIEW_RESULT = {
    type: "object",
    properties: { view: VIEW },
    required: ["view"],
    additionalProperties: false,
} as const;

const NO_PAYLOAD = {
    type: "object",
    properties: {},
    additionalProperties: false,
} as const;

/** The first and the last day a document can write (years 0000–9999). */
const FIRST_DAY = toEpochDay({ year: 0, month: 1, day: 1 });
const LAST_DAY = toEpochDay({ year: 9999, month: 12, day: 31 });

function outsideYears(
    anchor: number,
    path: string | undefined,
): Failure | undefined {
    return anchor < FIRST_DAY || anchor > LAST_DAY
        ? fail("refused", "the view would leave the years 0000–9999", path)
        : undefined;
}

function viewResult(view: ViewState): { view: ViewResult } {
    return { view: { ...view } };
}

/** Moves the view to `anchor`, or refuses a range outside `validRange`. */
function goTo(
    draft: Draft,
    anchor: number,
    path: string | undefined,
): { view: ViewResult } | Failure {
    const { settings } = draft.state;
    const beyond = outsideYears(anchor, path);
    if (beyond) return beyond;
    const view = Object.freeze({
        ...draft.state.view,
        anchorDate: formatPlainDate(fromEpochDay(anchor)),
    });
    const refusal = outsideValidRange(view, settings, anchor, path);
    if (refusal) return refusal;
    draft.set({ view });
    return viewResult(view);
}

function outsideValidRange(
    view: ViewState,
    settings: CalendarSettings,
    date: number | undefined,
    path: string | undefined,
): Failure | undefined {
    if (settings.validRange === undefined) return undefined;
    const valid = validDays(settings);
    if (date !== undefined && !isValidDay(date, valid)) {
        return fail(
            "refused",
            `${formatPlainDate(fromEpochDay(date))} is outside validRange`,
            path,
        );
    }
    // a valid anchor can still show only other days (a day view skips a hidden anchor)
    return touchesValid(viewDays(view, settings).current, valid)
        ? undefined
        : fail(
              "refused",
              "the view would show only dates outside validRange",
              path,
          );
}

export const viewSet = defineCommand({
    name: "view.set",
    description:
        "Change the view type, keeping the anchor date: `month`, `week`, `day`, `days` (with `days`: 1–14 days that are not hidden) or `list` (with an optional `duration` in days; without it, the anchor's month).",
    payloadSchema: {
        type: "object",
        properties: {
            type: VIEW_TYPE,
            days: VIEW_DAYS,
            duration: LIST_DURATION,
        },
        required: ["type"],
        additionalProperties: false,
    },
    resultSchema: VIEW_RESULT,
    transient: false,
    reduce: (payload, { draft }) => {
        if (payload.type === "days" && payload.days === undefined) {
            return fail("invalid_payload", 'a "days" view needs days', "/days");
        }
        if (payload.type !== "days" && payload.days !== undefined) {
            return fail(
                "invalid_payload",
                'only a "days" view takes days',
                "/days",
            );
        }
        if (payload.type !== "list" && payload.duration !== undefined) {
            return fail(
                "invalid_payload",
                'only a "list" view takes a duration',
                "/duration",
            );
        }
        const view: ViewState = Object.freeze({
            type: payload.type,
            anchorDate: draft.state.view.anchorDate,
            ...(payload.days === undefined ? {} : { days: payload.days }),
            ...(payload.duration === undefined
                ? {}
                : { duration: payload.duration }),
        });
        const refusal = outsideValidRange(
            view,
            draft.state.settings,
            undefined,
            undefined,
        );
        if (refusal) return refusal;
        draft.set({ view });
        return ok(viewResult(view));
    },
});

export const viewGoTo = defineCommand({
    name: "view.go-to",
    description:
        "Show the view around a date (YYYY-MM-DD, or { year, month, day } as a date picker gives it). A date outside validRange is refused.",
    payloadSchema: {
        type: "object",
        properties: {
            date: {
                anyOf: [
                    PLAIN_DATE,
                    {
                        type: "object",
                        properties: {
                            year: { type: "integer" },
                            month: { type: "integer", minimum: 1, maximum: 12 },
                            day: { type: "integer", minimum: 1, maximum: 31 },
                        },
                        required: ["year", "month", "day"],
                        additionalProperties: false,
                    },
                ],
            },
        },
        required: ["date"],
        additionalProperties: false,
    },
    resultSchema: VIEW_RESULT,
    transient: false,
    reduce: (payload, { draft }) => {
        const date = parsePlainDate(payload.date, "/date");
        if (!date.ok) {
            const [issue] = date.issues;
            return fail(
                "invalid_payload",
                issue?.message ?? "not a date",
                "/date",
            );
        }
        const result = goTo(draft, toEpochDay(date.value), "/date");
        return "ok" in result ? result : ok(result);
    },
});

function stepCommand<C extends "view.next" | "view.previous">(
    name: C,
    step: 1 | -1,
    description: string,
) {
    return defineCommand({
        name,
        description,
        payloadSchema: NO_PAYLOAD,
        resultSchema: VIEW_RESULT,
        transient: false,
        reduce: (_payload, { draft }) => {
            const { view, settings } = draft.state;
            const anchor = steppedAnchor(view, settings, step);
            const beyond = outsideYears(anchor, undefined);
            if (beyond) return beyond;
            const next = Object.freeze({
                ...view,
                anchorDate: formatPlainDate(fromEpochDay(anchor)),
            });
            const refusal = outsideValidRange(
                next,
                settings,
                undefined,
                undefined,
            );
            if (refusal) return refusal;
            draft.set({ view: next });
            return ok(viewResult(next));
        },
    });
}

export const viewNext = stepCommand(
    "view.next",
    1,
    "Show the next range, by the view's own step: a month, a week, a day, `days` days that are not hidden, or a list's duration (its month without one). Refused when it would show only dates outside validRange.",
);

export const viewPrevious = stepCommand(
    "view.previous",
    -1,
    "Show the previous range, by the view's own step (as view.next). Refused when it would show only dates outside validRange.",
);

export const viewToday = defineCommand({
    name: "view.today",
    description:
        "Show the view around today (the model's clock, in the display zone). Refused when today is outside validRange.",
    payloadSchema: NO_PAYLOAD,
    resultSchema: VIEW_RESULT,
    transient: false,
    reduce: (_payload, { draft }) => {
        // an injected clock that gives no instant is refused, not thrown out of the command
        const now = draft.now();
        if (!isWritable(Math.floor(now))) {
            return fail(
                "refused",
                `the model's clock gave ${now}, not an instant`,
            );
        }
        const result = goTo(
            draft,
            todayOf(draft.state.settings, () => now),
            undefined,
        );
        return "ok" in result ? result : ok(result);
    },
});
