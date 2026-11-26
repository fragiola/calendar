// The edit rules (D9), inside the commands so no caller bypasses them, and `can` / `check` ask the
// same: a flag is the most specific one given, the event's own, then its `editable`, then its
// calendar's `editable`, then the settings' flag, then the settings' `editable`.
import type { CalendarEvent, CalendarInfo } from "../document/calendar-event";
import type { CalendarSettings } from "../document/calendar-settings";
import { type Failure, fail } from "./define";

/** An event's permissions in effect. */
export interface EventPermissions {
    readonly editable: boolean;
    readonly startEditable: boolean;
    readonly durationEditable: boolean;
    readonly deletable: boolean;
}

/** A permission an edit needs. */
export type Permission = keyof EventPermissions;

/** Where a permission in effect comes from, for a refusal's message. */
type Source = "the event" | "its calendar" | "the settings";

function resolve(
    permission: Permission,
    event: CalendarEvent,
    calendar: CalendarInfo | undefined,
    settings: CalendarSettings,
): { value: boolean; source: Source } {
    const chain: [boolean | undefined, Source][] =
        permission === "editable"
            ? [
                  [event.editable, "the event"],
                  [calendar?.editable, "its calendar"],
                  [settings.editable, "the settings"],
              ]
            : [
                  [event[permission], "the event"],
                  [event.editable, "the event"],
                  [calendar?.editable, "its calendar"],
                  [settings[permission], "the settings"],
                  [settings.editable, "the settings"],
              ];
    for (const [value, source] of chain) {
        if (value !== undefined) return { value, source };
    }
    return { value: true, source: "the settings" };
}

/** An event's permissions in effect (`get("event-permissions-by")`). */
export function permissionsOf(
    event: CalendarEvent,
    calendar: CalendarInfo | undefined,
    settings: CalendarSettings,
): EventPermissions {
    return {
        editable: resolve("editable", event, calendar, settings).value,
        startEditable: resolve("startEditable", event, calendar, settings)
            .value,
        durationEditable: resolve("durationEditable", event, calendar, settings)
            .value,
        deletable: resolve("deletable", event, calendar, settings).value,
    };
}

const DOING: Record<Permission, string> = {
    editable: "cannot be changed",
    startEditable: "cannot move: its start is not editable",
    durationEditable: "cannot be resized: its duration is not editable",
    deletable: "cannot be removed",
};

/** The refusal of an edit that needs `permission`, or `undefined` when the event allows it. */
export function refusedEdit(
    permission: Permission,
    event: CalendarEvent,
    calendar: CalendarInfo | undefined,
    settings: CalendarSettings,
): Failure | undefined {
    const { value, source } = resolve(permission, event, calendar, settings);
    return value
        ? undefined
        : fail(
              "refused",
              `event "${event.id}" ${DOING[permission]} (${source} ${source === "the settings" ? "say so" : "says so"})`,
              "/eventId",
          );
}
