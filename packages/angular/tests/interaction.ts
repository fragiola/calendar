// Pointer and key helpers for the adapter's interaction tests: native events on the rendered
// elements, which the engine hears on its root (packages/react's), each step let Angular render.
import type { Type } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { fireEvent } from "@testing-library/dom";

let pointerId = 1;

/** The fixture of the test under way: what the event helpers wait for. */
let current: ComponentFixture<unknown> | undefined;

/** The center of a part's element in the fake layout (tests/setup.ts). */
export function center(element: Element): { x: number; y: number } {
    const box = element.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** Lets Angular render what the last event changed, its after-render hooks included. */
export async function flush(): Promise<void> {
    for (let i = 0; i < 3; i++) {
        await current?.whenStable();
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await current?.whenStable();
}

/** A mounted component: its element and how to change its inputs. */
export interface Rendered<C> {
    readonly fixture: ComponentFixture<C>;
    readonly container: HTMLElement;
    readonly component: C;
    /** sets inputs of the component, then lets Angular render */
    set(inputs: Record<string, unknown>): Promise<void>;
}

/** Mounts a component in the document (focus and events need it) with its inputs, then lets Angular settle. */
export async function render<C>(
    component: Type<C>,
    inputs: Record<string, unknown> = {},
): Promise<Rendered<C>> {
    const fixture = TestBed.createComponent(component);
    current = fixture as ComponentFixture<unknown>;
    document.body.append(fixture.nativeElement as HTMLElement);
    const set = async (next: Record<string, unknown>) => {
        for (const [name, value] of Object.entries(next)) {
            fixture.componentRef.setInput(name, value);
        }
        await flush();
    };
    await set(inputs);
    return {
        fixture,
        container: fixture.nativeElement as HTMLElement,
        component: fixture.componentInstance,
        set,
    };
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

/** A part's element by its part name (and `data-date`, `data-occurrence-id`, …), or a failure. */
export function part(
    container: ParentNode,
    name: string,
    attributes: Record<string, string> = {},
): HTMLElement {
    const selector = `[data-calendar-part="${name}"]${Object.entries(attributes)
        .map(([key, value]) => `[${key}="${value}"]`)
        .join("")}`;
    const element = container.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`no ${selector}`);
    return element;
}
