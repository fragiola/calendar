import type { CalendarSettingsJson } from "../document/calendar-document";
import { SETTINGS_SCHEMA } from "../document/calendar-schema";
import type { CalendarSettings } from "../document/calendar-settings";
import { settingsIssues } from "../document/settings-issues";
import { requiresFeature } from "../features/keys";
import { SETTINGS_FIELDS } from "../schema/fragments";
import { cloneJson } from "../state/clone-json";
import { deepFreeze } from "../state/deep-freeze";
import { defineCommand, fail, invalid, ok } from "./define";

const NULL = { type: "null" } as const;

export const settingsSet = defineCommand({
    name: "settings.set",
    description:
        'Change settings: each field given replaces the setting (the display `timeZone`, IANA or "local"; `locale`; `firstDayOfWeek`; `hiddenDays`; the time grid\'s slots; `validRange`; `dayMaxEvents`; `eventOrder`; the default durations; the edit flags; with their features, `businessHours`, `eventConstraint`, `selectConstraint`, `overlap`, `eventSources`). `null` removes an optional one (`firstDayOfWeek`, `snapDuration`, `validRange`, `startEditable`, `durationEditable`, `deletable`, and the settings of features) so its default applies.',
    payloadSchema: {
        type: "object",
        properties: {
            settings: {
                type: "object",
                properties: {
                    ...SETTINGS_FIELDS,
                    firstDayOfWeek: {
                        anyOf: [SETTINGS_FIELDS.firstDayOfWeek, NULL],
                    },
                    snapDuration: {
                        anyOf: [SETTINGS_FIELDS.snapDuration, NULL],
                    },
                    validRange: { anyOf: [SETTINGS_FIELDS.validRange, NULL] },
                    startEditable: { anyOf: [{ type: "boolean" }, NULL] },
                    durationEditable: { anyOf: [{ type: "boolean" }, NULL] },
                    deletable: { anyOf: [{ type: "boolean" }, NULL] },
                    businessHours: {
                        anyOf: [SETTINGS_FIELDS.businessHours, NULL],
                    },
                    eventConstraint: {
                        anyOf: [SETTINGS_FIELDS.eventConstraint, NULL],
                    },
                    selectConstraint: {
                        anyOf: [SETTINGS_FIELDS.selectConstraint, NULL],
                    },
                    overlap: { anyOf: [SETTINGS_FIELDS.overlap, NULL] },
                    eventSources: {
                        anyOf: [SETTINGS_FIELDS.eventSources, NULL],
                    },
                },
                additionalProperties: false,
            },
        },
        required: ["settings"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: { settings: SETTINGS_SCHEMA },
        required: ["settings"],
        additionalProperties: false,
    },
    transient: false,
    reduce: (payload, { draft, features }) => {
        for (const key of Object.keys(payload.settings)) {
            const owner = features.missing("settings", key);
            if (owner !== undefined) {
                return fail(
                    "invalid_payload",
                    `"${key}" ${requiresFeature(owner)}`,
                    `/settings/${key}`,
                );
            }
        }
        const next: Record<string, unknown> = { ...draft.state.settings };
        for (const [key, value] of Object.entries(payload.settings)) {
            if (value === null) delete next[key];
            else if (value !== undefined) next[key] = cloneJson(value);
        }
        const failed = invalid([
            ...settingsIssues(next, "/settings"),
            ...features.settingsIssues(next, "/settings"),
        ]);
        if (failed) return failed;
        const settings = deepFreeze(next) as unknown as CalendarSettings;
        draft.set({ settings });
        return ok({ settings: cloneJson(settings) as CalendarSettingsJson });
    },
});
