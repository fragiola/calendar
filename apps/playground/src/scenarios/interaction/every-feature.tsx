import { Calendar, createCalendarModel } from "@fragiola/calendar-react";
import { constraints } from "@fragiola/calendar-react/constraints";
import { dragAndDrop } from "@fragiola/calendar-react/drag-and-drop";
import { nowIndicator } from "@fragiola/calendar-react/now-indicator";
import { recurrence } from "@fragiola/calendar-react/recurrence";
import { resize } from "@fragiola/calendar-react/resize";
import { selection } from "@fragiola/calendar-react/selection";
import { useState } from "react";
import "../../fixture/fixture.css";
import { NOW, SETTINGS, Toolbar, timed, View } from "../../fixture/calendar";
import { useInspector } from "../../inspector/context";

// Every interactive feature on one model, with the Inspector on: drag, resize and select, and see
// the one command each gesture commits (a preview is engine state, never a command).

const FEATURES = [
    selection(),
    dragAndDrop(),
    resize(),
    recurrence(),
    nowIndicator(),
    constraints(),
] as const;

export default function EveryFeature() {
    const [model] = useState(() =>
        createCalendarModel(
            {
                version: 1,
                settings: {
                    ...SETTINGS,
                    businessHours: [
                        {
                            daysOfWeek: [1, 2, 3, 4, 5],
                            startTime: "09:00",
                            endTime: "17:00",
                        },
                    ],
                },
                events: [
                    timed("standup", "2026-11-26", "09:00", "09:30"),
                    timed("weekly", "2026-11-24", "11:00", "12:00", {
                        recurrence: { rule: "FREQ=WEEKLY;COUNT=6" },
                        timeZone: "America/New_York",
                    }),
                ],
                view: { type: "week", anchorDate: "2026-11-26" },
            },
            { now: () => NOW, features: FEATURES },
        ),
    );
    useInspector(model);
    return (
        <Calendar.Root model={model} aria-label="Calendar">
            <Toolbar />
            <View
                parts={{
                    selection: true,
                    drag: true,
                    resize: true,
                    now: true,
                    businessHours: true,
                }}
            />
        </Calendar.Root>
    );
}
