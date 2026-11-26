import { dragAndDrop } from "@fragiola/calendar-react/drag-and-drop";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Fixture } from "../../src/fixture/calendar";
import "../../src/fixture/fixture.css";

// A DST week in America/New_York: daylight saving time ends on Sunday 2026-11-01 at 02:00 (the
// clocks go back to 01:00). An event at 09:00 every day keeps its wall clock across the change,
// and one written with the summer offset sits at its instant. The week starts on Saturday, so
// Saturday 2026-10-31 (summer time) and Monday 2026-11-02 (standard time) are in one week. Open
// with `?view=week&date=2026-11-01`.

const EVENTS = [
    {
        id: "before",
        title: "before",
        start: "2026-10-31T09:00:00-04:00",
        end: "2026-10-31T10:00:00-04:00",
        allDay: false,
    },
    {
        id: "after",
        title: "after",
        start: "2026-11-02T09:00:00-05:00",
        end: "2026-11-02T10:00:00-05:00",
        allDay: false,
    },
    {
        id: "night",
        title: "night",
        start: "2026-11-01T00:30:00-04:00",
        end: "2026-11-01T03:30:00-05:00",
        allDay: false,
    },
];

const container = document.getElementById("app");
if (!container) throw new Error("no #app");
createRoot(container).render(
    <StrictMode>
        <Fixture
            events={EVENTS}
            settings={{ firstDayOfWeek: 6 }}
            features={[dragAndDrop()] as const}
            parts={{ drag: true }}
        />
    </StrictMode>,
);
