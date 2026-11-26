import { Calendar, createCalendarModel } from "@fragiola/calendar-react";
import { useState } from "react";
import "../../fixture/fixture.css";
import {
    allDay,
    NOW,
    SETTINGS,
    Toolbar,
    timed,
    View,
} from "../../fixture/calendar";
import { useInspector } from "../../inspector/context";

// Every view of one model, unstyled, with the Inspector on: the view buttons run `view.set`,
// Previous / Next / Today the navigation commands; the model JSON follows.

export default function EveryView() {
    const [model] = useState(() =>
        createCalendarModel(
            {
                version: 1,
                settings: SETTINGS,
                events: [
                    allDay("trip", "2026-11-23", "2026-11-26"),
                    timed("standup", "2026-11-26", "09:00", "09:30"),
                    timed("review", "2026-11-26", "09:15", "10:15"),
                ],
                view: { type: "week", anchorDate: "2026-11-26" },
            },
            { now: () => NOW },
        ),
    );
    useInspector(model);
    return (
        <Calendar.Root model={model} aria-label="Calendar">
            <Toolbar />
            <View parts={{}} />
        </Calendar.Root>
    );
}
