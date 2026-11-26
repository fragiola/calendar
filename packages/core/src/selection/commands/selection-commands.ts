// `selection.set` and `selection.clear`: the selected range is model state (an AI or a server can
// select without a screen), set by the engine's pointer and keyboard selection on release or
// Enter. Nonsense is refused (an end not after the start, a bound not of the range's kind), and
// so is a range outside `validRange` or one `selectConstraint` refuses (`constraints()`, through
// the `checkSelection` contribution point).
import { defineCommand, fail, ok } from "../../commands/define";
import type { SelectionRange } from "../../features/types";
import { toEpochDay } from "../../time/epoch-day";
import { instant } from "../../time/instant";
import { plainDateInZone } from "../../time-zone/plain-date-in-zone";
import { resolveTimeZone } from "../../time-zone/resolve-time-zone";
import { validDays } from "../../view/valid-days";
import { spanOf } from "../state/selection-range";

const RANGE = {
    type: "object",
    properties: {
        start: {
            type: "string",
            description:
                "the first day (YYYY-MM-DD) of an all-day range, else its first instant (RFC 3339 with its offset)",
        },
        end: {
            type: "string",
            description: "its end, exclusive, of the same kind as start",
        },
        allDay: { type: "boolean" },
    },
    required: ["start", "end", "allDay"],
    additionalProperties: false,
} as const;

export const selectionSet = defineCommand({
    name: "selection.set",
    description:
        "Select a range of days (allDay, dates as YYYY-MM-DD, end exclusive) or of time (RFC 3339 date-times with their offsets). Refused outside validRange, and when selectConstraint refuses it (with constraints()). The selection is view state of the model, not part of the document.",
    payloadSchema: RANGE,
    resultSchema: RANGE,
    transient: false,
    reduce: (payload, { draft, features }) => {
        const range: SelectionRange = {
            start: payload.start,
            end: payload.end,
            allDay: payload.allDay,
        };
        const span = spanOf(range);
        if (!span) {
            return fail(
                "invalid_payload",
                range.allDay
                    ? "an all-day range's start and end are dates as YYYY-MM-DD"
                    : "a timed range's start and end are RFC 3339 date-times with their offsets",
                "/start",
            );
        }
        if (span.end <= span.start) {
            return fail(
                "invalid_payload",
                "the end must be after the start (it is exclusive)",
                "/end",
            );
        }
        const { settings } = draft.state;
        const valid = validDays(settings);
        const zone = resolveTimeZone(settings.timeZone);
        const [first, after] = span.allDay
            ? [span.start, span.end]
            : [
                  toEpochDay(plainDateInZone(instant(span.start), zone)),
                  toEpochDay(plainDateInZone(instant(span.end - 1), zone)) + 1,
              ];
        if (first < valid.start || after > valid.end) {
            return fail("refused", "the range leaves validRange");
        }
        const refusal = features.checkSelection(draft.state, range);
        if (refusal) return refusal;
        const selection = Object.freeze(range);
        draft.set({ selection });
        return ok({ ...selection });
    },
});

export const selectionClear = defineCommand({
    name: "selection.clear",
    description:
        "Clear the selected range; `cleared` says whether there was one.",
    payloadSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: { cleared: { type: "boolean" } },
        required: ["cleared"],
        additionalProperties: false,
    },
    transient: false,
    reduce: (_payload, { draft }) => {
        const cleared = draft.state.selection != null;
        if (cleared) draft.set({ selection: null });
        return ok({ cleared });
    },
});
