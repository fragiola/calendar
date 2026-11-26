// A server render is the first client render (no hydration warning) for the month, week and
// list views: before the engine exists, the parts' attributes are the core's `partAttributes`,
// the tab stop where the model puts it; once the engine runs they stay the same until something
// is focused.
import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Calendar, type ViewType } from "../src";
import { nowIndicator } from "../src/now-indicator";
import { selection } from "../src/selection";
import {
    allDay,
    ListView,
    MonthGrid,
    modelOf,
    TimeGridView,
    timed,
} from "./calendar";

const EVENTS = [
    allDay("a", "2026-11-24", "2026-11-27"),
    timed("t", "09:00", "10:00"),
    timed("u", "09:30", "11:00"),
];

function App(props: { type: ViewType }) {
    const model = modelOf(EVENTS, {
        view: { type: props.type, anchorDate: "2026-11-26" },
        features: [selection(), nowIndicator()],
    });
    return (
        <Calendar.Root model={model}>
            {props.type === "month" ? (
                <MonthGrid />
            ) : props.type === "list" ? (
                <ListView />
            ) : (
                <TimeGridView />
            )}
        </Calendar.Root>
    );
}

describe("a server render", () => {
    for (const type of ["month", "week", "list"] as const) {
        it(`${type}: hydrates with no warning, and the engine's attributes match it`, async () => {
            const html = renderToString(<App type={type} />);
            expect(html).toContain('data-calendar-part="root"');
            const container = document.createElement("div");
            container.innerHTML = html;
            document.body.append(container);
            const error = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const recoverable = vi.fn();
            await act(async () => {
                hydrateRoot(container, <App type={type} />, {
                    onRecoverableError: recoverable,
                });
            });
            expect(error).not.toHaveBeenCalled();
            expect(recoverable).not.toHaveBeenCalled();
            error.mockRestore();
            // the engine attached: what it renders is what the server rendered
            expect(container.innerHTML).toBe(html);
            container.remove();
        });
    }

    it("has the grid's roles and its one tab stop before any engine", () => {
        const html = renderToString(<App type="week" />);
        expect(html).toContain('role="grid"');
        expect(html.match(/tabindex="0"/g)).toHaveLength(1);
        expect(html).toMatch(
            /data-calendar-part="slot"[^>]*data-date="2026-11-26"[^>]*data-time="00:00"[^>]*tabindex="0"|tabindex="0"[^>]*data-calendar-part="slot"/,
        );
    });
});
