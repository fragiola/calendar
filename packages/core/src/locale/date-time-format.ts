// One `Intl.DateTimeFormat` per locale, zone and options, reused: building one is far slower than
// formatting with it, and a view formats every day header and slot label.

/** Formatting options a part helper accepts: the zone is the helper's, never an option. */
export type FormatOptions = Omit<Intl.DateTimeFormatOptions, "timeZone">;

const formats = new Map<string, Intl.DateTimeFormat>();

/** The cached formatter of a locale and options in a zone. */
export function dateTimeFormat(
    locale: string,
    timeZone: string,
    options: FormatOptions,
): Intl.DateTimeFormat {
    const key = `${locale}\u0000${timeZone}\u0000${JSON.stringify(options)}`;
    let format = formats.get(key);
    if (!format) {
        format = new Intl.DateTimeFormat(locale, { ...options, timeZone });
        formats.set(key, format);
    }
    return format;
}
