import { constraints } from "@fragiola/calendar-react/constraints";
import { dragAndDrop } from "@fragiola/calendar-react/drag-and-drop";
import { externalDrop } from "@fragiola/calendar-react/external-drop";
import { nowIndicator } from "@fragiola/calendar-react/now-indicator";
import { recurrence } from "@fragiola/calendar-react/recurrence";
import { resize } from "@fragiola/calendar-react/resize";
import { selection } from "@fragiola/calendar-react/selection";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Fixture, timed } from "../../src/fixture/calendar";
import "../../src/fixture/fixture.css";

// The stress fixture: every feature and 2 000 events over the weeks around 2026-11-26 (about 70 a
// day in the month, 40 a day in the week). Each week row's and each column's children function
// (stable: `useCallback` in src/fixture/calendar.tsx) counts its calls in `window.renders`
// (`week <id>`, `column <date>`): moving one event re-renders only the rows or columns it touches
// (e2e/stress.spec.ts).

const FIRST_DAY = Date.UTC(2026, 9, 25);

function events() {
    const list = [];
    for (let index = 0; index < 2000; index++) {
        const day = new Date(FIRST_DAY + (index % 49) * 86_400_000)
            .toISOString()
            .slice(0, 10);
        const hour = 6 + (index % 13);
        const start = `${String(hour).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
        const end = `${String(hour + 1).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
        list.push(timed(`e${index}`, day, start, end));
    }
    return list;
}

declare global {
    interface Window {
        renders: Record<string, number>;
    }
}

window.renders = {};
const count = (key: string) => {
    window.renders[key] = (window.renders[key] ?? 0) + 1;
};

const FEATURES = [
    selection(),
    dragAndDrop(),
    resize(),
    recurrence(),
    nowIndicator(),
    constraints(),
    externalDrop(),
] as const;

const container = document.getElementById("app");
if (!container) throw new Error("no #app");
createRoot(container).render(
    <StrictMode>
        <Fixture
            events={events()}
            features={FEATURES}
            settings={{ dayMaxEvents: 3 }}
            parts={{ selection: true, drag: true, resize: true, now: true }}
            count={count}
        />
    </StrictMode>,
);
