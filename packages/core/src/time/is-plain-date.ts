import { daysInMonth } from "./days-in-month";
import type { PlainDate } from "./plain-date";

/** Whether a value is a real date: integer `year` (0–9999), `month` (1–12) and `day` in its month. */
export function isPlainDate(value: unknown): value is PlainDate {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const { year, month, day } = value as Record<string, unknown>;
    return (
        Number.isInteger(year) &&
        Number.isInteger(month) &&
        Number.isInteger(day) &&
        (year as number) >= 0 &&
        (year as number) <= 9999 &&
        (month as number) >= 1 &&
        (month as number) <= 12 &&
        (day as number) >= 1 &&
        (day as number) <= daysInMonth(year as number, month as number)
    );
}
