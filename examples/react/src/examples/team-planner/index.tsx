"use client";

import {
    Calendar,
    type CalendarEngineEventOf,
    createCalendarModel,
    type SelectionRange,
    useCalendarTitle,
} from "@fragiola/calendar-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { CALENDARS, day, type Types } from "../_kit/data";
import { text } from "../_kit/format";
import { CalendarsPanel } from "./calendars-panel";
import { EventEditor, type NewEvent } from "./event-editor";
import { MiniMonth } from "./mini-month";
import {
    askForScope,
    features,
    type PendingEdit,
    plannerEvents,
    runWithScope,
} from "./planner";
import { PlannerGrid } from "./planner-grid";
import { ScopeDialog } from "./scope-dialog";
import * as styles from "./styles";

// A team's week, every feature at once: a calendar per person (shown or hidden from the panel), a
// mini month to jump around, events to drag and resize, a range to select that opens an editor, a
// daily standup whose edits ask "this, following or all?", and business hours shaded in the grid.
export default function TeamPlanner() {
    const [model] = useState(() =>
        createCalendarModel<Types, typeof features>(
            {
                version: 1,
                events: plannerEvents(),
                calendars: CALENDARS,
                settings: {
                    businessHours: [
                        {
                            daysOfWeek: [1, 2, 3, 4, 5],
                            startTime: "08:00",
                            endTime: "18:00",
                        },
                    ],
                },
                view: { type: "week", anchorDate: day() },
            },
            { features },
        ),
    );
    const [range, setRange] = useState<SelectionRange | null>(null);
    const [pending, setPending] = useState<PendingEdit | null>(null);

    // an edit of a recurring event waits for its scope (planner.ts)
    useEffect(() => model.use(askForScope(setPending)), [model]);

    const closeEditor = () => {
        setRange(null);
        model.run("selection.clear", {});
    };
    const save = ({ title, calendarId, range }: NewEvent) => {
        model.run("event.add", {
            kind: "meeting",
            title,
            calendarId,
            start: range.start,
            end: range.end,
            allDay: range.allDay,
        });
        closeEditor();
    };

    return (
        <Calendar.Root
            model={model}
            className={styles.root}
            onSelect={(event: CalendarEngineEventOf<"select">) =>
                setRange(event.range)
            }
        >
            <aside aria-label="Planner" className={styles.sidebar}>
                <MiniMonth />
                <CalendarsPanel />
            </aside>
            <div className={styles.main}>
                <Toolbar />
                <PlannerGrid />
            </div>
            <EventEditor
                range={range}
                when={range ? when(range, model.state.settings.locale) : ""}
                onSave={save}
                onClose={closeEditor}
            />
            <ScopeDialog
                open={pending !== null}
                onPick={(scope) => {
                    if (pending) runWithScope(model, pending, scope);
                    setPending(null);
                }}
                onCancel={() => setPending(null)}
            />
        </Calendar.Root>
    );
}

/** A selected range in words, for the editor's description. */
function when(range: SelectionRange, locale: string): string {
    if (range.allDay) return `All day from ${range.start}`;
    return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
    }).formatRange(Date.parse(range.start), Date.parse(range.end));
}

function Toolbar() {
    const title = useCalendarTitle();
    return (
        <div className={styles.toolbar}>
            <h2 className={styles.title}>{text(title)}</h2>
            <Calendar.ViewButton view="day" className={styles.button}>
                Day
            </Calendar.ViewButton>
            <Calendar.ViewButton view="week" className={styles.button}>
                Week
            </Calendar.ViewButton>
            <Calendar.Today className={styles.button}>Today</Calendar.Today>
            <Calendar.Previous
                aria-label="Previous"
                className={styles.iconButton}
            >
                <ChevronLeft aria-hidden className={styles.flip} />
            </Calendar.Previous>
            <Calendar.Next aria-label="Next" className={styles.iconButton}>
                <ChevronRight aria-hidden className={styles.flip} />
            </Calendar.Next>
        </div>
    );
}
