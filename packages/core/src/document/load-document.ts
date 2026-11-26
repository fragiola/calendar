// Loading a document (D3): plain JSON, then its JSON Schema, then what a schema cannot say (each
// event's rules, ids used once, references to calendars, the settings' rules, the view, the fields
// of features that are not installed, each installed feature's rules), then the state: settings
// resolved, ids generated with `createId` where missing, every object frozen.
import { requiresFeature } from "../features/keys";
import type { ComposedFeatures } from "../features/registry";
import type { FeatureDocument } from "../features/types";
import { jsonIssues, validate } from "../schema/validator";
import type { CalendarState, ViewState } from "../state/calendar-state";
import { cloneJson } from "../state/clone-json";
import { deepFreeze } from "../state/deep-freeze";
import { fromEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import { parsePlainDate } from "../time/parse-plain-date";
import { todayOf } from "../view/today";
import { validDays } from "../view/valid-days";
import type {
    CalendarDocument,
    CalendarSettingsJson,
    ViewJson,
} from "./calendar-document";
import type { CalendarEvent, CalendarInfo } from "./calendar-event";
import { calendarSchema } from "./calendar-schema";
import { type CalendarSettings, DEFAULT_SETTINGS } from "./calendar-settings";
import { toCalendar, toEvent } from "./entities";
import { eventIssues } from "./event-issues";
import type { IdSource } from "./id-source";
import { settingsIssues } from "./settings-issues";
import type { ValidationIssue } from "./validation-issue";

/** What loading needs besides the document. */
export interface LoadContext {
    readonly features: ComposedFeatures;
    readonly ids: IdSource;
    readonly now: () => number;
    /** where the document is (a JSON pointer prefix for its issues) */
    readonly path?: string;
}

export type LoadResult =
    | { readonly ok: true; readonly state: CalendarState }
    | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

/** The settings a document's settings resolve to (with the features' defaults). */
export function resolveSettings(
    json: CalendarSettingsJson | undefined,
    features: ComposedFeatures,
): CalendarSettings {
    return deepFreeze({
        ...DEFAULT_SETTINGS,
        ...features.settings,
        ...cloneJson(json),
    }) as CalendarSettings;
}

/** The problems of a view's fields (they matched its schema), at `path`. */
export function viewIssues(view: ViewJson, path: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const anchor = parsePlainDate(view.anchorDate, `${path}/anchorDate`);
    if (!anchor.ok) issues.push(...anchor.issues);
    if (view.type === "days" && view.days === undefined) {
        issues.push({
            path: `${path}/days`,
            message: 'is required for a "days" view',
        });
    }
    if (view.type !== "days" && view.days !== undefined) {
        issues.push({
            path: `${path}/days`,
            message: 'only a "days" view takes days',
        });
    }
    if (view.type !== "list" && view.duration !== undefined) {
        issues.push({
            path: `${path}/duration`,
            message: 'only a "list" view takes a duration',
        });
    }
    return issues;
}

/** The issues of the document's names that belong to features that are not installed. */
function featureFieldIssues(
    json: Readonly<Record<string, unknown>>,
    features: ComposedFeatures,
    path: string,
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const key of Object.keys(json)) {
        const owner = features.missing("fields", key);
        if (owner !== undefined) {
            issues.push({
                path: `${path}/${key}`,
                message: requiresFeature(owner),
            });
        }
    }
    const settings = json.settings;
    if (typeof settings === "object" && settings !== null) {
        for (const key of Object.keys(settings)) {
            const owner = features.missing("settings", key);
            if (owner !== undefined) {
                issues.push({
                    path: `${path}/settings/${key}`,
                    message: requiresFeature(owner),
                });
            }
        }
    }
    return issues;
}

/**
 * The anchor of a document without a view: today, moved into `validRange` when outside it
 * (FullCalendar's documented behaviour for its initial date), so navigation starts inside.
 */
function defaultAnchor(settings: CalendarSettings, now: () => number): number {
    const today = todayOf(settings, now);
    const valid = validDays(settings);
    if (today < valid.start) return valid.start;
    if (today >= valid.end) return valid.end - 1;
    return today;
}

/** Validates a document and builds its state, or returns every problem found. */
export function loadDocument(json: unknown, context: LoadContext): LoadResult {
    const { features, ids } = context;
    const path = context.path ?? "";
    const notJson = jsonIssues(json, path);
    if (notJson.length > 0) return { ok: false, issues: notJson };
    const schemaIssues = validate(calendarSchema, json, path);
    const featureIssues =
        typeof json === "object" && json !== null && !Array.isArray(json)
            ? featureFieldIssues(
                  json as Record<string, unknown>,
                  features,
                  path,
              )
            : [];
    if (schemaIssues.length > 0 || featureIssues.length > 0) {
        // a feature's field the schema does not know is reported once, naming its feature
        const named = new Set(featureIssues.map((issue) => issue.path));
        return {
            ok: false,
            issues: [
                ...featureIssues,
                ...schemaIssues.filter((issue) => !named.has(issue.path)),
            ],
        };
    }
    const doc = json as CalendarDocument;
    const issues: ValidationIssue[] = [];
    if (doc.settings) {
        issues.push(
            ...settingsIssues(doc.settings, `${path}/settings`),
            ...features.settingsIssues(
                doc.settings as Readonly<Record<string, unknown>>,
                `${path}/settings`,
            ),
        );
    }
    const calendarIds = new Set<string>();
    (doc.calendars ?? []).forEach((calendar, at) => {
        if (calendar.id === undefined) return;
        if (calendarIds.has(calendar.id)) {
            issues.push({
                path: `${path}/calendars/${at}/id`,
                message: `"${calendar.id}" is the id of another calendar`,
            });
        }
        calendarIds.add(calendar.id);
    });
    const eventIds = new Set<string>();
    doc.events.forEach((event, at) => {
        const at_ = `${path}/events/${at}`;
        if (event.id !== undefined) {
            if (eventIds.has(event.id)) {
                issues.push({
                    path: `${at_}/id`,
                    message: `"${event.id}" is the id of another event`,
                });
            }
            eventIds.add(event.id);
        }
        if (
            event.calendarId !== undefined &&
            !calendarIds.has(event.calendarId)
        ) {
            issues.push({
                path: `${at_}/calendarId`,
                message: `no calendar has the id "${event.calendarId}"`,
            });
        }
        issues.push(
            ...eventIssues(
                event as unknown as Readonly<Record<string, unknown>> &
                    typeof event,
                at_,
                features,
            ),
        );
    });
    if (doc.view) issues.push(...viewIssues(doc.view, `${path}/view`));
    issues.push(
        ...features.issues(
            doc as unknown as FeatureDocument,
            (pointer) => `${path}${pointer}`,
        ),
    );
    if (issues.length > 0) return { ok: false, issues };

    const settings = resolveSettings(doc.settings, features);
    const calendars: CalendarInfo[] = [];
    const usedCalendars = new Set(calendarIds);
    for (const calendar of doc.calendars ?? []) {
        const id =
            calendar.id ??
            ids.next("calendar", (candidate) => usedCalendars.has(candidate));
        usedCalendars.add(id);
        calendars.push(toCalendar(calendar, id));
    }
    const events: CalendarEvent[] = [];
    const usedEvents = new Set(eventIds);
    for (const event of doc.events) {
        const id =
            event.id ??
            ids.next("event", (candidate) => usedEvents.has(candidate));
        usedEvents.add(id);
        events.push(
            toEvent(event as unknown as Readonly<Record<string, unknown>>, id),
        );
    }
    const view: ViewState = doc.view
        ? deepFreeze(cloneJson(doc.view))
        : Object.freeze({
              type: "month",
              anchorDate: formatPlainDate(
                  fromEpochDay(defaultAnchor(settings, context.now)),
              ),
          });
    const core: CalendarState = Object.freeze({
        events: Object.freeze(events),
        calendars: Object.freeze(calendars),
        settings,
        view,
    });
    const own = features.load(doc as unknown as FeatureDocument, core);
    return {
        ok: true,
        state:
            Object.keys(own).length === 0
                ? core
                : Object.freeze({ ...core, ...deepFreeze(own) }),
    };
}
