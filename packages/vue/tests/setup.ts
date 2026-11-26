import { enableAutoUnmount } from "@vue/test-utils";
import { afterEach } from "vitest";

// every wrapper mounted by a test unmounts after it, as Testing Library's cleanup does
enableAutoUnmount(afterEach);
afterEach(() => {
    // a test file in the node environment (server rendering) has no document
    if (typeof document !== "undefined") document.body.innerHTML = "";
});

// The fake layout of packages/react's tests. jsdom lays nothing out: every calendar part gets a
// rect from its place, so the engine's hit-testing works as in a browser. A month's days are 100 × 100 from (0, 100), seven a row; a
// time grid's all-day days are 100 × 50 at y 0 from x 50, its columns 100 wide from x 50 and y 100,
// one pixel a minute (09:00 is y 640), its slots 30 tall; a timed event sits at its percentages
// of its column; a segment fills its day's events (20 tall, stacked); a resize handle is the
// last 4 pixels of its event.
type Rect = { left: number; top: number; width: number; height: number };

const ZERO: Rect = { left: 0, top: 0, width: 0, height: 0 };

function indexIn(element: Element, selector: string, scope: Element | null) {
    return scope ? [...scope.querySelectorAll(selector)].indexOf(element) : -1;
}

function rectOf(element: HTMLElement): Rect {
    const part = element.getAttribute("data-calendar-part");
    const root = element.closest('[data-calendar-part="root"]');
    switch (part) {
        case "root":
            return { left: 0, top: 0, width: 800, height: 1600 };
        case "day": {
            const row = element.closest(
                '[data-calendar-part="week"], [data-calendar-part="all-day-row"]',
            );
            const column = indexIn(element, '[data-calendar-part="day"]', row);
            if (row?.getAttribute("data-calendar-part") === "all-day-row") {
                return {
                    left: 50 + column * 100,
                    top: 0,
                    width: 100,
                    height: 50,
                };
            }
            const week = indexIn(
                row as Element,
                '[data-calendar-part="week"]',
                root,
            );
            return {
                left: column * 100,
                top: 100 + week * 100,
                width: 100,
                height: 100,
            };
        }
        case "day-events": {
            const day = rectOf(element.parentElement as HTMLElement);
            return { ...day, top: day.top + 20, height: day.height - 20 };
        }
        case "segment": {
            const events = element.closest('[data-calendar-part="day-events"]');
            const box = events ? rectOf(events as HTMLElement) : ZERO;
            const lane = indexIn(
                element,
                '[data-calendar-part="segment"]',
                events,
            );
            return { ...box, top: box.top + lane * 20, height: 20 };
        }
        case "column": {
            const index = indexIn(
                element,
                '[data-calendar-part="column"]',
                root,
            );
            return {
                left: 50 + index * 100,
                top: 100,
                width: 100,
                height: 1440,
            };
        }
        case "column-events":
            return rectOf(
                element.closest('[data-calendar-part="column"]') as HTMLElement,
            );
        case "time-event": {
            const column = rectOf(
                element.closest('[data-calendar-part="column"]') as HTMLElement,
            );
            const top = Number.parseFloat(element.style.top) / 100;
            const height = Number.parseFloat(element.style.height) / 100;
            return {
                left: column.left,
                top: column.top + top * column.height,
                width: column.width,
                height: height * column.height,
            };
        }
        case "slot": {
            const date = element.getAttribute("data-date");
            const [h, m] = (element.getAttribute("data-time") ?? "0:0")
                .split(":")
                .map(Number);
            const column = root?.querySelector(
                `[data-calendar-part="column"][data-date="${date}"]`,
            );
            const box = column ? rectOf(column as HTMLElement) : ZERO;
            return {
                left: box.left,
                top: box.top + (h ?? 0) * 60 + (m ?? 0),
                width: 100,
                height: 30,
            };
        }
        case "resize-handle": {
            const event = rectOf(element.parentElement as HTMLElement);
            return { ...event, top: event.top + event.height - 4, height: 4 };
        }
        case "scroller":
            return { left: 0, top: 100, width: 800, height: 1500 };
        default:
            return ZERO;
    }
}

if (typeof window !== "undefined") {
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
        configurable: true,
        value: function getBoundingClientRect(this: HTMLElement) {
            const { left, top, width, height } = rectOf(this);
            return {
                left,
                top,
                width,
                height,
                right: left + width,
                bottom: top + height,
                x: left,
                y: top,
                toJSON: () => ({}),
            };
        },
    });
}
