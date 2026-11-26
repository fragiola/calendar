import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { allDay, Fixture, timed } from "../../src/fixture/calendar";
import "../../src/fixture/fixture.css";

// The bare fixture: no feature installed. Every view renders, navigates and keeps one roving tab
// stop; nothing can be selected, dragged or resized. `?view=` picks the view (month by default).

const EVENTS = [
    allDay("trip", "2026-11-23", "2026-11-26"),
    allDay("holiday", "2026-11-26", "2026-11-27"),
    timed("standup", "2026-11-26", "09:00", "09:30"),
    timed("review", "2026-11-26", "09:15", "10:15"),
    timed("lunch", "2026-11-27", "12:00", "13:00"),
    timed("late", "2026-12-02", "18:00", "19:00"),
];

const container = document.getElementById("app");
if (!container) throw new Error("no #app");
createRoot(container).render(
    <StrictMode>
        <Fixture events={EVENTS} />
    </StrictMode>,
);
