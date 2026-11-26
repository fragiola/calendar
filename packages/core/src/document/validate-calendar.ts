import { composeFeatures } from "../features/registry";
import type { CalendarFeatures } from "../features/types";
import { IdSource } from "./id-source";
import { loadDocument } from "./load-document";
import type { ValidationIssue } from "./validation-issue";

/** Options of {@link validateCalendar}. */
export interface ValidateCalendarOptions {
    /** the features the document is for: a field of one not listed is an issue (D3) */
    features?: CalendarFeatures | undefined;
}

/**
 * The problems of a calendar document, each with its JSON path (an empty list: valid). What
 * `createCalendarModel` throws as a `CalendarValidationError`, returned instead.
 */
export function validateCalendar(
    json: unknown,
    options: ValidateCalendarOptions = {},
): readonly ValidationIssue[] {
    const loaded = loadDocument(json, {
        features: composeFeatures(options.features),
        ids: new IdSource(),
        now: Date.now,
    });
    return loaded.ok ? [] : loaded.issues;
}
