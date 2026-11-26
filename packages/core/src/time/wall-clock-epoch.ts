// Wall-clock fields ↔ milliseconds counted as if the wall clock were UTC: the "local epoch" the
// time-zone domain shifts by an offset to get an instant. Overflowing fields carry (hour 24 is the
// next day's 00:00).
import { fromEpochDay, toEpochDay } from "./epoch-day";
import type { ZonedDateTimeFields } from "./zoned-date-time-fields";

const MS_PER_DAY = 86_400_000;

/** The wall clock as milliseconds since 1970-01-01T00:00 on the same wall clock. */
export function wallClockToEpoch(fields: ZonedDateTimeFields): number {
    return (
        toEpochDay(fields) * MS_PER_DAY +
        fields.hour * 3_600_000 +
        fields.minute * 60_000 +
        fields.second * 1000 +
        fields.millisecond
    );
}

/** The wall-clock fields of milliseconds since 1970-01-01T00:00 on that wall clock. */
export function epochToWallClock(epoch: number): ZonedDateTimeFields {
    const epochDay = Math.floor(epoch / MS_PER_DAY);
    let rest = epoch - epochDay * MS_PER_DAY;
    const hour = Math.floor(rest / 3_600_000);
    rest -= hour * 3_600_000;
    const minute = Math.floor(rest / 60_000);
    rest -= minute * 60_000;
    const second = Math.floor(rest / 1000);
    return {
        ...fromEpochDay(epochDay),
        hour,
        minute,
        second,
        millisecond: rest - second * 1000,
    };
}
