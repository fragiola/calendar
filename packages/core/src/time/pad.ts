/** An integer as `width` digits, zero-padded (`pad(7, 2)` is `"07"`). */
export function pad(value: number, width: number): string {
    return String(value).padStart(width, "0");
}
