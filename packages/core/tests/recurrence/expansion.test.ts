// Expansion against RFC 5545's examples (§3.8.5.3), written by hand from the RFC text: DTSTART
// 1997-09-02 09:00 America/New_York unless said, each list the occurrences the RFC gives (its
// DST change on 1997-10-26 keeps them at 09:00 on the wall clock).
import { describe, expect, it } from "vitest";
import { datesAt9, recurringModel, series } from "./recurrence-fixture";

function dates(
    rule: string,
    from: string,
    until: string,
    start = "1997-09-02",
    exdates?: string[],
) {
    const model = recurringModel([
        series(
            "r",
            start,
            rule,
            exdates ? { recurrence: { rule, exdates } } : {},
        ),
    ]);
    return datesAt9(model, from, until);
}

const days = (prefix: string, list: number[]) =>
    list.map((day) => `${prefix}-${String(day).padStart(2, "0")}`);

const range = (prefix: string, first: number, last: number) =>
    days(
        prefix,
        Array.from({ length: last - first + 1 }, (_, i) => first + i),
    );

describe("RFC 5545 examples: daily", () => {
    it("daily for 10 occurrences", () => {
        expect(
            dates("FREQ=DAILY;COUNT=10", "1997-08-01", "1998-01-01"),
        ).toEqual(range("1997-09", 2, 11));
    });

    it("daily until December 24, 1997 (UNTIL inclusive, in UTC)", () => {
        const list = dates(
            "FREQ=DAILY;UNTIL=19971224T000000Z",
            "1997-08-01",
            "1998-02-01",
        );
        expect(list).toHaveLength(113);
        expect(list[0]).toBe("1997-09-02");
        expect(list.at(-1)).toBe("1997-12-23");
    });

    it("every other day, forever (asked over a window)", () => {
        expect(
            dates("FREQ=DAILY;INTERVAL=2", "1997-09-01", "1997-09-13"),
        ).toEqual(days("1997-09", [2, 4, 6, 8, 10, 12]));
        // a window far from the start skips ahead
        expect(
            dates("FREQ=DAILY;INTERVAL=2", "2030-01-01", "2030-01-06"),
        ).toEqual(days("2030-01", [2, 4]));
    });

    it("every 10 days, 5 occurrences", () => {
        expect(
            dates("FREQ=DAILY;INTERVAL=10;COUNT=5", "1997-08-01", "1998-01-01"),
        ).toEqual([
            "1997-09-02",
            "1997-09-12",
            "1997-09-22",
            "1997-10-02",
            "1997-10-12",
        ]);
    });

    it("every day in January, for 3 years (yearly and daily forms)", () => {
        const expected = [
            ...range("1998-01", 1, 31),
            ...range("1999-01", 1, 31),
            ...range("2000-01", 1, 31),
        ];
        expect(
            dates(
                "FREQ=YEARLY;UNTIL=20000131T140000Z;BYMONTH=1;BYDAY=SU,MO,TU,WE,TH,FR,SA",
                "1997-12-01",
                "2001-03-01",
                "1998-01-01",
            ),
        ).toEqual(expected);
        expect(
            dates(
                "FREQ=DAILY;UNTIL=20000131T140000Z;BYMONTH=1",
                "1997-12-01",
                "2001-03-01",
                "1998-01-01",
            ),
        ).toEqual(expected);
    });
});

describe("RFC 5545 examples: weekly", () => {
    it("weekly for 10 occurrences, across the DST change at 09:00", () => {
        expect(
            dates("FREQ=WEEKLY;COUNT=10", "1997-08-01", "1998-01-01"),
        ).toEqual([
            ...days("1997-09", [2, 9, 16, 23, 30]),
            ...days("1997-10", [7, 14, 21, 28]),
            "1997-11-04",
        ]);
    });

    it("weekly until December 24, 1997", () => {
        const list = dates(
            "FREQ=WEEKLY;UNTIL=19971224T000000Z",
            "1997-08-01",
            "1998-02-01",
        );
        expect(list).toHaveLength(17);
        expect(list.at(-1)).toBe("1997-12-23");
    });

    it("every other week, forever", () => {
        expect(
            dates("FREQ=WEEKLY;INTERVAL=2;WKST=SU", "1997-08-01", "1998-02-01"),
        ).toEqual([
            ...days("1997-09", [2, 16, 30]),
            ...days("1997-10", [14, 28]),
            ...days("1997-11", [11, 25]),
            ...days("1997-12", [9, 23]),
            ...days("1998-01", [6, 20]),
        ]);
    });

    it("weekly on Tuesday and Thursday for five weeks (UNTIL and COUNT forms)", () => {
        const expected = [
            ...days("1997-09", [2, 4, 9, 11, 16, 18, 23, 25, 30]),
            "1997-10-02",
        ];
        expect(
            dates(
                "FREQ=WEEKLY;UNTIL=19971007T000000Z;WKST=SU;BYDAY=TU,TH",
                "1997-08-01",
                "1998-01-01",
            ),
        ).toEqual(expected);
        expect(
            dates(
                "FREQ=WEEKLY;COUNT=10;WKST=SU;BYDAY=TU,TH",
                "1997-08-01",
                "1998-01-01",
            ),
        ).toEqual(expected);
    });

    it("every other week on Monday, Wednesday and Friday until December 24, 1997", () => {
        expect(
            dates(
                "FREQ=WEEKLY;INTERVAL=2;UNTIL=19971224T000000Z;WKST=SU;BYDAY=MO,WE,FR",
                "1997-08-01",
                "1998-02-01",
            ),
        ).toEqual([
            ...days("1997-09", [2, 3, 5, 15, 17, 19, 29]),
            ...days("1997-10", [1, 3, 13, 15, 17, 27, 29, 31]),
            ...days("1997-11", [10, 12, 14, 24, 26, 28]),
            ...days("1997-12", [8, 10, 12, 22]),
        ]);
    });

    it("every other week on Tuesday and Thursday, for 8 occurrences", () => {
        expect(
            dates(
                "FREQ=WEEKLY;INTERVAL=2;COUNT=8;WKST=SU;BYDAY=TU,TH",
                "1997-08-01",
                "1998-01-01",
            ),
        ).toEqual([
            ...days("1997-09", [2, 4, 16, 18, 30]),
            ...days("1997-10", [2, 14, 16]),
        ]);
    });

    it("WKST changes which week a day belongs to", () => {
        expect(
            dates(
                "FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=MO",
                "1997-08-01",
                "1997-10-01",
                "1997-08-05",
            ),
        ).toEqual(days("1997-08", [5, 10, 19, 24]));
        expect(
            dates(
                "FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=SU",
                "1997-08-01",
                "1997-10-01",
                "1997-08-05",
            ),
        ).toEqual(days("1997-08", [5, 17, 19, 31]));
    });
});

describe("RFC 5545 examples: monthly", () => {
    it("monthly on the first Friday for 10 occurrences, and until December 24, 1997", () => {
        expect(
            dates(
                "FREQ=MONTHLY;COUNT=10;BYDAY=1FR",
                "1997-08-01",
                "1999-01-01",
                "1997-09-05",
            ),
        ).toEqual([
            "1997-09-05",
            "1997-10-03",
            "1997-11-07",
            "1997-12-05",
            "1998-01-02",
            "1998-02-06",
            "1998-03-06",
            "1998-04-03",
            "1998-05-01",
            "1998-06-05",
        ]);
        expect(
            dates(
                "FREQ=MONTHLY;UNTIL=19971224T000000Z;BYDAY=1FR",
                "1997-08-01",
                "1999-01-01",
                "1997-09-05",
            ),
        ).toEqual(["1997-09-05", "1997-10-03", "1997-11-07", "1997-12-05"]);
    });

    it("every other month on the first and last Sunday, for 10 occurrences", () => {
        expect(
            dates(
                "FREQ=MONTHLY;INTERVAL=2;COUNT=10;BYDAY=1SU,-1SU",
                "1997-08-01",
                "1999-01-01",
                "1997-09-07",
            ),
        ).toEqual([
            ...days("1997-09", [7, 28]),
            ...days("1997-11", [2, 30]),
            ...days("1998-01", [4, 25]),
            ...days("1998-03", [1, 29]),
            ...days("1998-05", [3, 31]),
        ]);
    });

    it("monthly on the second-to-last Monday, for 6 months", () => {
        expect(
            dates(
                "FREQ=MONTHLY;COUNT=6;BYDAY=-2MO",
                "1997-08-01",
                "1999-01-01",
                "1997-09-22",
            ),
        ).toEqual([
            "1997-09-22",
            "1997-10-20",
            "1997-11-17",
            "1997-12-22",
            "1998-01-19",
            "1998-02-16",
        ]);
    });

    it("monthly on the third-to-the-last day, forever", () => {
        expect(
            dates(
                "FREQ=MONTHLY;BYMONTHDAY=-3",
                "1997-08-01",
                "1998-03-01",
                "1997-09-28",
            ),
        ).toEqual([
            "1997-09-28",
            "1997-10-29",
            "1997-11-28",
            "1997-12-29",
            "1998-01-29",
            "1998-02-26",
        ]);
    });

    it("monthly on the 2nd and 15th, and on the first and last day, for 10 occurrences", () => {
        expect(
            dates(
                "FREQ=MONTHLY;COUNT=10;BYMONTHDAY=2,15",
                "1997-08-01",
                "1999-01-01",
            ),
        ).toEqual([
            ...days("1997-09", [2, 15]),
            ...days("1997-10", [2, 15]),
            ...days("1997-11", [2, 15]),
            ...days("1997-12", [2, 15]),
            ...days("1998-01", [2, 15]),
        ]);
        expect(
            dates(
                "FREQ=MONTHLY;COUNT=10;BYMONTHDAY=1,-1",
                "1997-08-01",
                "1999-01-01",
                "1997-09-30",
            ),
        ).toEqual([
            "1997-09-30",
            ...days("1997-10", [1, 31]),
            ...days("1997-11", [1, 30]),
            ...days("1997-12", [1, 31]),
            ...days("1998-01", [1, 31]),
            "1998-02-01",
        ]);
    });

    it("every 18 months on the 10th to the 15th, for 10 occurrences", () => {
        expect(
            dates(
                "FREQ=MONTHLY;INTERVAL=18;COUNT=10;BYMONTHDAY=10,11,12,13,14,15",
                "1997-08-01",
                "2000-01-01",
                "1997-09-10",
            ),
        ).toEqual([...range("1997-09", 10, 15), ...range("1999-03", 10, 13)]);
    });

    it("every Tuesday, every other month", () => {
        expect(
            dates(
                "FREQ=MONTHLY;INTERVAL=2;BYDAY=TU",
                "1997-08-01",
                "1998-02-01",
            ),
        ).toEqual([
            ...days("1997-09", [2, 9, 16, 23, 30]),
            ...days("1997-11", [4, 11, 18, 25]),
            ...days("1998-01", [6, 13, 20, 27]),
        ]);
    });

    it("every Friday the 13th, its start excluded (EXDATE)", () => {
        expect(
            dates(
                "FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13",
                "1997-08-01",
                "2001-01-01",
                "1997-09-02",
                ["1997-09-02T09:00:00-04:00"],
            ),
        ).toEqual([
            "1998-02-13",
            "1998-03-13",
            "1998-11-13",
            "1999-08-13",
            "2000-10-13",
        ]);
    });

    it("the first Saturday that follows the first Sunday of the month", () => {
        expect(
            dates(
                "FREQ=MONTHLY;BYDAY=SA;BYMONTHDAY=7,8,9,10,11,12,13;COUNT=10",
                "1997-08-01",
                "1999-01-01",
                "1997-09-13",
            ),
        ).toEqual([
            "1997-09-13",
            "1997-10-11",
            "1997-11-08",
            "1997-12-13",
            "1998-01-10",
            "1998-02-07",
            "1998-03-07",
            "1998-04-11",
            "1998-05-09",
            "1998-06-13",
        ]);
    });

    it("skips the days a month does not have", () => {
        expect(
            dates(
                "FREQ=MONTHLY;BYMONTHDAY=15,30;COUNT=5",
                "2007-01-01",
                "2008-01-01",
                "2007-01-15",
            ),
        ).toEqual([
            "2007-01-15",
            "2007-01-30",
            "2007-02-15",
            "2007-03-15",
            "2007-03-30",
        ]);
    });
});

describe("RFC 5545 examples: yearly", () => {
    it("yearly in June and July for 10 occurrences", () => {
        expect(
            dates(
                "FREQ=YEARLY;COUNT=10;BYMONTH=6,7",
                "1997-01-01",
                "2003-01-01",
                "1997-06-10",
            ),
        ).toEqual(
            ["1997", "1998", "1999", "2000", "2001"].flatMap((year) => [
                `${year}-06-10`,
                `${year}-07-10`,
            ]),
        );
    });

    it("every other year in January, February and March, for 10 occurrences", () => {
        expect(
            dates(
                "FREQ=YEARLY;INTERVAL=2;COUNT=10;BYMONTH=1,2,3",
                "1997-01-01",
                "2005-01-01",
                "1997-03-10",
            ),
        ).toEqual([
            "1997-03-10",
            ...["1999", "2001", "2003"].flatMap((year) => [
                `${year}-01-10`,
                `${year}-02-10`,
                `${year}-03-10`,
            ]),
        ]);
    });

    it("every 20th Monday of the year", () => {
        expect(
            dates(
                "FREQ=YEARLY;BYDAY=20MO",
                "1997-01-01",
                "2000-01-01",
                "1997-05-19",
            ),
        ).toEqual(["1997-05-19", "1998-05-18", "1999-05-17"]);
    });

    it("every Thursday in March", () => {
        expect(
            dates(
                "FREQ=YEARLY;BYMONTH=3;BYDAY=TH",
                "1997-01-01",
                "2000-01-01",
                "1997-03-13",
            ),
        ).toEqual([
            ...days("1997-03", [13, 20, 27]),
            ...days("1998-03", [5, 12, 19, 26]),
            ...days("1999-03", [4, 11, 18, 25]),
        ]);
    });

    it("every Thursday, only in June, July and August", () => {
        expect(
            dates(
                "FREQ=YEARLY;BYDAY=TH;BYMONTH=6,7,8",
                "1997-01-01",
                "1998-01-01",
                "1997-06-05",
            ),
        ).toEqual([
            ...days("1997-06", [5, 12, 19, 26]),
            ...days("1997-07", [3, 10, 17, 24, 31]),
            ...days("1997-08", [7, 14, 21, 28]),
        ]);
    });

    it("U.S. presidential election day", () => {
        expect(
            dates(
                "FREQ=YEARLY;INTERVAL=4;BYMONTH=11;BYDAY=TU;BYMONTHDAY=2,3,4,5,6,7,8",
                "1996-01-01",
                "2005-01-01",
                "1996-11-05",
            ),
        ).toEqual(["1996-11-05", "2000-11-07", "2004-11-02"]);
    });

    it("a yearly start on February 29 repeats only in leap years", () => {
        expect(
            dates("FREQ=YEARLY", "2024-01-01", "2033-01-01", "2024-02-29"),
        ).toEqual(["2024-02-29", "2028-02-29", "2032-02-29"]);
    });
});
