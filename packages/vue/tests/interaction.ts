// Pointer and key helpers for the adapter's interaction tests: native events on the rendered
// elements, which the engine hears on its root (packages/react's, each step flushed by Vue).
import { fireEvent } from "@testing-library/dom";
import { nextTick } from "vue";

let pointerId = 1;

/** The center of a part's element in the fake layout (tests/setup.ts). */
export function center(element: Element): { x: number; y: number } {
    const box = element.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** Lets Vue render what the last event changed, then runs the post-render work. */
export async function flush(): Promise<void> {
    await nextTick();
    await nextTick();
}

/** A mouse drag from an element's center by `dx`, `dy` pixels, in steps. */
export async function drag(
    element: Element,
    dx: number,
    dy: number,
): Promise<void> {
    const start = center(element);
    const id = ++pointerId;
    const init = (x: number, y: number, buttons: number) => ({
        pointerId: id,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons,
        clientX: x,
        clientY: y,
        bubbles: true,
    });
    fireEvent.pointerDown(element, init(start.x, start.y, 1));
    await flush();
    for (const step of [0.25, 0.5, 1]) {
        fireEvent.pointerMove(
            element,
            init(start.x + dx * step, start.y + dy * step, 1),
        );
        await flush();
    }
    fireEvent.pointerUp(element, init(start.x + dx, start.y + dy, 0));
    await flush();
}

/** A key on the element holding DOM focus. */
export async function key(
    name: string,
    init: KeyboardEventInit = {},
): Promise<void> {
    const target = document.activeElement ?? document.body;
    fireEvent.keyDown(target, { key: name, ...init });
    await flush();
}

/** What holds DOM focus: its part, date, time and occurrence. */
export function focused(): string {
    const element = document.activeElement;
    if (!element) return "";
    return [
        element.getAttribute("data-calendar-part"),
        element.getAttribute("data-date"),
        element.getAttribute("data-time"),
        element.getAttribute("data-occurrence-id"),
    ]
        .filter((value) => value !== null)
        .join(" ");
}
