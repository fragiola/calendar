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

// "+N more": a month that shows two events a day (`dayMaxEvents: 2`); 2026-11-26 has five. The
// link is the last item of the day's events on the keyboard; a press is `more-click` (logged).

const EVENTS = [
    allDay("a", "2026-11-26", "2026-11-27"),
    allDay("b", "2026-11-26", "2026-11-27"),
    timed("c", "2026-11-26", "09:00", "10:00"),
    timed("d", "2026-11-26", "11:00", "12:00"),
    timed("e", "2026-11-26", "15:00", "16:00"),
    timed("f", "2026-11-27", "10:00", "11:00"),
];

function App() {
    const { log, push } = useEventLog();
    return (
        <Fixture events={EVENTS} settings={{ dayMaxEvents: 2 }} onEvent={push}>
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
