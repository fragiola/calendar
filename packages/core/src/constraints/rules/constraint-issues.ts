// The constraints' settings past their JSON Schema: business hours whose times parse and keep
// their order, constraint ranges of dates or date-times in order (at least one: an empty list
// would refuse everything), and `"business-hours"` only with business hours to stand for.
import type {
    BusinessHours,
    EventConstraint,
} from "../../document/calendar-document";
import type { ValidationIssue } from "../../document/validation-issue";
import { instantOf, minutesOf } from "../ranges/spans";

function rangeIssues(
    constraint: Readonly<EventConstraint> | undefined,
    path: string,
    hasBusinessHours: boolean,
    issues: ValidationIssue[],
): void {
    if (constraint === undefined) return;
    if (constraint === "business-hours") {
        if (!hasBusinessHours) {
            issues.push({
                path,
                message: '"business-hours" needs the businessHours setting',
            });
        }
        return;
    }
    if (constraint.length === 0) {
        issues.push({
            path,
            message:
                "lists at least one range (leave the setting out for no constraint)",
        });
    }
    constraint.forEach((range, i) => {
        // a date's day start is the same order in any zone that matters here: UTC reads it
        const start =
            range.start === undefined
                ? undefined
                : instantOf(range.start, "UTC");
        const end =
            range.end === undefined ? undefined : instantOf(range.end, "UTC");
        for (const [edge, value, at] of [
            ["start", range.start, start],
            ["end", range.end, end],
        ] as const) {
            if (value !== undefined && at === undefined) {
                issues.push({
                    path: `${path}/${i}/${edge}`,
                    message:
                        "is not a date (YYYY-MM-DD) or an RFC 3339 date-time with its offset",
                });
            }
        }
        if (start !== undefined && end !== undefined && end <= start) {
            issues.push({
                path: `${path}/${i}/end`,
                message: "must be after start (the end is exclusive)",
            });
        }
    });
}

/** The problems of the constraints' settings, at `path` (the settings'). */
export function constraintIssues(
    settings: Readonly<Record<string, unknown>>,
    path: string,
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const hours = settings.businessHours as
        | readonly Readonly<BusinessHours>[]
        | undefined;
    hours?.forEach((rule, i) => {
        const at = `${path}/businessHours/${i}`;
        const start = minutesOf(rule.startTime);
        const end = minutesOf(rule.endTime);
        if (start === undefined)
            issues.push({
                path: `${at}/startTime`,
                message: "is not a time (HH:mm)",
            });
        if (end === undefined)
            issues.push({
                path: `${at}/endTime`,
                message: "is not a time (HH:mm, up to 24:00)",
            });
        if (start !== undefined && end !== undefined && end <= start) {
            issues.push({
                path: `${at}/endTime`,
                message: "must be after startTime",
            });
        }
    });
    const hasHours = hours !== undefined && hours.length > 0;
    rangeIssues(
        settings.eventConstraint as EventConstraint | undefined,
        `${path}/eventConstraint`,
        hasHours,
        issues,
    );
    rangeIssues(
        settings.selectConstraint as EventConstraint | undefined,
        `${path}/selectConstraint`,
        hasHours,
        issues,
    );
    return issues;
}
