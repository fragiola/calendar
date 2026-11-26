import { constraints } from "@fragiola/calendar-react/constraints";
import { dragAndDrop } from "@fragiola/calendar-react/drag-and-drop";
import { externalDrop } from "@fragiola/calendar-react/external-drop";
import { nowIndicator } from "@fragiola/calendar-react/now-indicator";
import { recurrence } from "@fragiola/calendar-react/recurrence";
import { resize } from "@fragiola/calendar-react/resize";
import { selection } from "@fragiola/calendar-react/selection";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
    allDay,
    Fixture,
    Log,
    timed,
    useEventLog,
} from "../../src/fixture/calendar";
import "../../src/fixture/fixture.css";

// Every interactive feature: select a range, drag and resize events (pointer, touch and keyboard),
// drop a task from outside, a weekly series. `?view=` and `?dir=rtl` pick the view and the
// direction. The engine's events are logged in `data-testid="log"`.

const EVENTS = [
    allDay("trip", "2026-11-23", "2026-11-25"),
    timed("standup", "2026-11-26", "09:00", "09:30"),
    timed("review", "2026-11-26", "14:00", "15:00"),
    timed("weekly", "2026-11-24", "11:00", "12:00", {
        recurrence: { rule: "FREQ=WEEKLY;COUNT=6" },
        timeZone: "America/New_York",
    }),
];

const FEATURES = [
    selection(),
    dragAndDrop(),
    resize(),
    recurrence(),
    nowIndicator(),
    constraints(),
    externalDrop({
        draft: (data) => ({ title: data.getData("text/plain") || "Task" }),
    }),
] as const;

function App() {
    const { log, push } = useEventLog();
    return (
        <Fixture
            events={EVENTS}
            features={FEATURES}
            settings={{
                businessHours: [
                    {
                        daysOfWeek: [1, 2, 3, 4, 5],
                        startTime: "09:00",
                        endTime: "17:00",
                    },
                ],
            }}
            parts={{
                selection: true,
                drag: true,
                resize: true,
                now: true,
                businessHours: true,
            }}
            onEvent={push}
        >
            <ul aria-label="Tasks">
                <li
                    draggable="true"
                    data-testid="task"
                    onDragStart={(event) =>
                        event.dataTransfer.setData(
                            "text/plain",
                            "Write the report",
                        )
                    }
                >
                    Write the report
                </li>
            </ul>
            <Log log={log} />
        </Fixture>
    );
}

const container = document.getElementById("app");
if (!container) throw new Error("no #app");
createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
