// A locale's week: its first day, its weekend and the minimal days of week 1, from
// `Intl.Locale#getWeekInfo()` (or the older `weekInfo` getter). Without a table of our own, the
// fallbacks are rules: an engine with neither gives ISO 8601's week (Monday, Saturday and Sunday,
// 4 days); an engine that gives no `minimalDays` (the proposal dropped it, as Node 26 has) gets 4
// when the locale's week starts on Monday (ISO's and most of Europe's rule) and 1 otherwise (week
// 1 holds January 1, the rule of the Sunday and Saturday locales). An explicit `firstDayOfWeek`
// setting wins over the locale's first day and keeps the locale's minimal days.
import type { Weekday } from "../time/day-of-week";

/** A week's rules: which day starts it, which days are the weekend, how week 1 is chosen. */
export interface WeekInfo {
    /** 0 = Sunday … 6 = Saturday. */
    readonly firstDay: Weekday;
    /** The weekend days, ascending, 0 = Sunday. */
    readonly weekend: readonly Weekday[];
    /** Week 1 of a year is the first week holding at least this many of its days (1–7). */
    readonly minimalDays: number;
}

/** ISO 8601's week: Monday first, Saturday and Sunday off, week 1 holds the first Thursday. */
export const ISO_WEEK: WeekInfo = Object.freeze({
    firstDay: 1,
    weekend: Object.freeze([0, 6] as const),
    minimalDays: 4,
});

/** What `Intl.Locale` gives, days numbered 1 = Monday … 7 = Sunday. */
interface IntlWeekInfo {
    readonly firstDay: number;
    readonly weekend?: readonly number[];
    readonly minimalDays?: number;
}

interface LocaleWithWeekInfo {
    getWeekInfo?: () => IntlWeekInfo;
    weekInfo?: IntlWeekInfo;
}

const cache = new Map<string, WeekInfo>();

function toWeekday(intlDay: number): Weekday {
    return (intlDay % 7) as Weekday;
}

function readWeekInfo(locale: string): WeekInfo {
    const intl = new Intl.Locale(locale) as Intl.Locale & LocaleWithWeekInfo;
    const raw =
        typeof intl.getWeekInfo === "function"
            ? intl.getWeekInfo()
            : intl.weekInfo;
    if (!raw) {
        return ISO_WEEK;
    }
    const firstDay = toWeekday(raw.firstDay);
    return Object.freeze({
        firstDay,
        weekend: Object.freeze(
            (raw.weekend ?? [6, 7]).map(toWeekday).sort((a, b) => a - b),
        ),
        minimalDays: raw.minimalDays ?? (firstDay === 1 ? 4 : 1),
    });
}

/**
 * The week of a BCP 47 locale (`"pt-BR"`: Sunday first, week 1 holds January 1), with an explicit
 * `firstDayOfWeek` setting winning over its first day. An invalid locale is a `RangeError`
 * (validate it first: `validateLocale`).
 */
export function weekInfo(
    locale: string,
    settings: { readonly firstDayOfWeek?: Weekday } = {},
): WeekInfo {
    let info = cache.get(locale);
    if (!info) {
        info = readWeekInfo(locale);
        cache.set(locale, info);
    }
    const { firstDayOfWeek } = settings;
    return firstDayOfWeek === undefined || firstDayOfWeek === info.firstDay
        ? info
        : { ...info, firstDay: firstDayOfWeek };
}
