// Saving and restoring a calendar, as app code: the package ships no persistence, so where and when
// to save is the app's. The document is `model.get("calendar-json")` (JSON v1, the view included
// when asked); `createCalendarModel` reads it back. Copy this file and change it freely.
import type {
    CalendarDocument,
    CalendarModel,
    CalendarTypes,
} from "@fragiola/calendar-react";

/** The saved document under `key`, or undefined (nothing saved, storage blocked, bad JSON). */
export function restoreCalendar<T extends CalendarTypes>(
    key: string,
): CalendarDocument<T> | undefined {
    try {
        const text = window.localStorage.getItem(key);
        return text === null
            ? undefined
            : (JSON.parse(text) as CalendarDocument<T>);
    } catch {
        return undefined;
    }
}

/** Saves the model's document, with its view, under `key` (storage blocked: nothing). */
export function saveCalendar<T extends CalendarTypes>(
    key: string,
    model: CalendarModel<T>,
): boolean {
    try {
        window.localStorage.setItem(
            key,
            JSON.stringify(model.get("calendar-json", { includeView: true })),
        );
        return true;
    } catch {
        return false;
    }
}

/** Forgets the saved document (storage blocked: nothing). */
export function clearCalendar(key: string): void {
    try {
        window.localStorage.removeItem(key);
    } catch {
        // nothing saved, nothing to forget
    }
}
