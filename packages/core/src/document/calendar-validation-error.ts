import type { ValidationIssue } from "./validation-issue";

/**
 * Thrown by `createCalendarModel` for an invalid document: every problem, each with its JSON path
 * (D3). The only throw of the model's input: commands return results.
 */
export class CalendarValidationError extends Error {
    readonly issues: readonly ValidationIssue[];

    constructor(issues: readonly ValidationIssue[]) {
        const [first] = issues;
        super(
            first
                ? `Invalid calendar document: ${first.path || "/"} ${first.message}${issues.length > 1 ? ` (and ${issues.length - 1} more)` : ""}`
                : "Invalid calendar document",
        );
        this.name = "CalendarValidationError";
        this.issues = issues;
    }
}
