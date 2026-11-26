// An event's rules past its JSON Schema, the same in the document and in the commands that write
// one (`event.add`, `event.update`, a move or a resize): its times in the form its `allDay` says
// and in order (`event-times.ts`), its home zone an IANA name, its data plain JSON, no field of a
// feature that is not installed, and each installed feature's own rules.
import { requiresFeature } from "../features/keys";
import type { ComposedFeatures } from "../features/registry";
import { jsonIssues } from "../schema/validator";
import { LOCAL_TIME_ZONE } from "../time-zone/resolve-time-zone";
import { validateTimeZone } from "../time-zone/validate-time-zone";
import { readTimes, type TimedFields } from "./event-times";
import type { ValidationIssue } from "./validation-issue";

/** The problems of an event's fields (they matched the event schema), at `path`. */
export function eventIssues(
    event: Readonly<Record<string, unknown>> & TimedFields,
    path: string,
    features: ComposedFeatures,
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const key of Object.keys(event)) {
        const owner = features.missing("eventFields", key);
        if (owner !== undefined) {
            issues.push({
                path: `${path}/${key}`,
                message: requiresFeature(owner),
            });
        }
    }
    readTimes(event, path, issues);
    const timeZone = event.timeZone;
    if (timeZone === LOCAL_TIME_ZONE) {
        issues.push({
            path: `${path}/timeZone`,
            message:
                'an event\'s home zone is an IANA name, not "local" (leave it out for the display zone)',
        });
    } else if (timeZone !== undefined) {
        const zone = validateTimeZone(timeZone, `${path}/timeZone`);
        if (!zone.ok) issues.push(...zone.issues);
    }
    issues.push(...jsonIssues(event.data, `${path}/data`));
    issues.push(...features.eventIssues(event, path));
    return issues;
}
