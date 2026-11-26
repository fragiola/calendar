"use client";

import {
    Calendar,
    createCalendarModel,
    type Segment,
    useCalendar,
    useCalendarTitle,
    useDayHeader,
} from "@fragiola/calendar-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { SegmentedControl } from "#/components/ui/segmented-control";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, titleOf } from "../_kit/format";
import * as styles from "./styles";

// One month in several locales: `settings.set { locale }` changes the first day of the week (the
// locale's, unless `firstDayOfWeek` says otherwise), the weekday names and the title (`Intl` parts)
// and the week numbers (`weekNumbers: "locale"`, or ISO 8601's weeks). The words are the locale's;
// the grid's names (its label, the buttons') are the app's.

const LOCALES = [
    { locale: "en-US", label: "English (US)" },
    { locale: "en-GB", label: "English (UK)" },
    { locale: "de-DE", label: "Deutsch" },
    { locale: "ja-JP", label: "日本語" },
] as const;

const RULES = [
    { rule: "locale", label: "Locale weeks" },
    { rule: "iso", label: "ISO weeks" },
] as const;

export default function LocaleAndWeekNumbers() {
    const [model] = useState(() =>
        createCalendarModel<Types>({
            version: 1,
            events: teamWeek(),
            calendars: CALENDARS,
            settings: {
                locale: "en-US",
                weekNumbers: "locale",
                dayMaxEvents: "auto",
            },
            view: { type: "month", anchorDate: day() },
        }),
    );
    return (
        <Calendar.Root model={model} className={styles.root} weekNumberColumn>
            <Toolbar />
            <Settings />
            <Calendar.DayGrid aria-label="Month" className={styles.grid}>
                <Calendar.ColumnHeaders className={styles.headers}>
                    {(date) => <Weekday date={date} />}
                </Calendar.ColumnHeaders>
                <Calendar.Weeks>
                    {(week) => (
                        <Calendar.Week week={week} className={styles.week}>
                            <Calendar.WeekNumber className={styles.weekNumber}>
                                {({ weekNumber }) => weekNumber}
                            </Calendar.WeekNumber>
                            <Calendar.Days>
                                {(day) => (
                                    <Calendar.Day
                                        day={day}
                                        className={styles.day}
                                    >
                                        <div className={styles.dayHeader}>
                                            <span className={styles.dayNumber}>
                                                {Number(day.date.slice(8))}
                                            </span>
                                            <Calendar.More
                                                className={styles.more}
                                            >
                                                {({ hiddenCount }) =>
                                                    `+${hiddenCount}`
                                                }
                                            </Calendar.More>
                                        </div>
                                        <Calendar.DayEvents
                                            className={styles.dayEvents}
                                        >
                                            {(segment) => (
                                                <EventSegment
                                                    segment={segment}
                                                />
                                            )}
                                        </Calendar.DayEvents>
                                    </Calendar.Day>
                                )}
                            </Calendar.Days>
                        </Calendar.Week>
                    )}
                </Calendar.Weeks>
            </Calendar.DayGrid>
        </Calendar.Root>
    );
}

// The locale and the week-number rule: app state that each runs one `settings.set`.
function Settings() {
    const { model } = useCalendar<Types>();
    const [locale, setLocale] = useState<string | null>(
        model.state.settings.locale,
    );
    const [rule, setRule] = useState<string | null>(
        model.state.settings.weekNumbers,
    );
    return (
        <div className={styles.settings}>
            <SegmentedControl.Root
                aria-label="Locale"
                value={locale}
                onValueChange={(next) => {
                    if (!next) return;
                    setLocale(next);
                    model.run("settings.set", { settings: { locale: next } });
                }}
            >
                {LOCALES.map(({ locale, label }) => (
                    <SegmentedControl.Item key={locale} value={locale}>
                        {label}
                    </SegmentedControl.Item>
                ))}
            </SegmentedControl.Root>
            <SegmentedControl.Root
                aria-label="Week numbers"
                value={rule}
                onValueChange={(next) => {
                    if (next !== "iso" && next !== "locale") return;
                    setRule(next);
                    model.run("settings.set", {
                        settings: { weekNumbers: next },
                    });
                }}
            >
                {RULES.map(({ rule, label }) => (
                    <SegmentedControl.Item key={rule} value={rule}>
                        {label}
                    </SegmentedControl.Item>
                ))}
            </SegmentedControl.Root>
        </div>
    );
}

function Toolbar() {
    const title = useCalendarTitle();
    return (
        <div className={styles.toolbar}>
            <h2 className={styles.title}>{text(title)}</h2>
            <Calendar.Today className={styles.button}>Today</Calendar.Today>
            <Calendar.Previous
                aria-label="Previous month"
                className={styles.iconButton}
            >
                <ChevronLeft aria-hidden className={styles.flip} />
            </Calendar.Previous>
            <Calendar.Next
                aria-label="Next month"
                className={styles.iconButton}
            >
                <ChevronRight aria-hidden className={styles.flip} />
            </Calendar.Next>
        </div>
    );
}

function Weekday({ date }: { date: string }) {
    const parts = useDayHeader(date, { weekday: "short" });
    return (
        <Calendar.ColumnHeader date={date} className={styles.header}>
            {text(parts)}
        </Calendar.ColumnHeader>
    );
}

function EventSegment({ segment }: { segment: Segment }) {
    const { model } = useCalendar<Types>();
    return (
        <Calendar.Segment segment={segment} className={styles.segment}>
            <span className={styles.segmentLabel}>
                {titleOf(model, segment.occurrenceId, segment.eventId)}
            </span>
        </Calendar.Segment>
    );
}
