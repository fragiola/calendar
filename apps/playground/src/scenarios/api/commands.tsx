import { Calendar, createCalendarModel } from "@fragiola/calendar-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import "../../fixture/fixture.css";
import { NOW, SETTINGS, Toolbar, timed, View } from "../../fixture/calendar";
import { useInspector } from "../../inspector/context";

// The model from code: each button runs one command (`event.add`, `event.move`, `event.remove`,
// `view.next`); the Inspector logs it and the model JSON follows. No engine is needed for any of
// them: an AI or a server drives the calendar the same way.

export default function Commands() {
    const [model] = useState(() =>
        createCalendarModel(
            {
                version: 1,
                settings: SETTINGS,
                events: [timed("standup", "2026-11-26", "09:00", "09:30")],
                view: { type: "week", anchorDate: "2026-11-26" },
            },
            { now: () => NOW },
        ),
    );
    useInspector(model);
    const run = {
        add: () =>
            model.run("event.add", {
                title: "Lunch",
                start: "2026-11-26T12:00:00-05:00",
                end: "2026-11-26T13:00:00-05:00",
                allDay: false,
            }),
        move: () =>
            model.run("event.move", {
                eventId: "standup",
                delta: { minutes: 60 },
            }),
        remove: () => model.run("event.remove", { eventId: "standup" }),
        next: () => model.run("view.next", {}),
    };
    return (
        <div>
            <div>
                <Clickable.Button variant="outline" size="sm" onClick={run.add}>
                    Add lunch
                </Clickable.Button>
                <Clickable.Button
                    variant="outline"
                    size="sm"
                    onClick={run.move}
                >
                    Move standup
                </Clickable.Button>
                <Clickable.Button
                    variant="outline"
                    size="sm"
                    onClick={run.remove}
                >
                    Remove standup
                </Clickable.Button>
                <Clickable.Button
                    variant="outline"
                    size="sm"
                    onClick={run.next}
                >
                    Next week
                </Clickable.Button>
            </div>
            <Calendar.Root model={model} aria-label="Calendar">
                <Toolbar />
                <View parts={{}} />
            </Calendar.Root>
        </div>
    );
}
