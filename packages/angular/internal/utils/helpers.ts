// From Flow (fragiola/flow, packages/angular/src/lib/utils/helpers.ts, its copy of Tree's and
// Dockable's), same author and licence: the host, the input transforms, `beforeInputs`, and the
// attributes and the structural style a directive keeps on its element.
import {
    DestroyRef,
    ElementRef,
    effect,
    type Injector,
    inject,
    isSignal,
    type Signal,
    untracked,
} from "@angular/core";

/** The host element of the directive being created. */
export function injectHost(): HTMLElement {
    return inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
}

/** Runs `teardown` when the directive (or component) being created is destroyed. */
export function onDestroy(teardown: () => void): void {
    inject(DestroyRef).onDestroy(teardown);
}

/** `true` for a bare attribute (`<div calendarRoot weekNumberColumn>`), else the value as a boolean. */
export function booleanInput(value: unknown): boolean {
    return value === "" || (value !== "false" && Boolean(value));
}

/** A number input that also takes its attribute's text (`longPressDelay="300"`), keeping `undefined`. */
export function optionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const number = typeof value === "number" ? value : Number(value);
    return Number.isNaN(number) ? undefined : number;
}

/**
 * What `read` returns, or `fallback` while a required input it reads is not set yet. A part's
 * `state()` may be read by bindings on its own element (`[class.today]="day.state().day.today"`),
 * and Angular may read a binding before it sets the inputs of its element's directives: the input
 * then throws (NG0950). The read still tracks the input, so the computed that calls this runs
 * again once the input is set.
 */
export function beforeInputs<V>(fallback: V, read: () => V): V {
    try {
        return read();
    } catch (error) {
        if ((error as { code?: unknown } | null)?.code === -950)
            return fallback;
        throw error;
    }
}

/** A value, or a signal or a getter of it (an injection function's argument). */
export type ValueOrSignal<V> = V | Signal<V> | (() => V);

/** The value of a {@link ValueOrSignal} now (a signal or a getter is read, and tracked). */
export function valueNow<V>(value: ValueOrSignal<V>): V {
    return isSignal(value) || typeof value === "function"
        ? (value as () => V)()
        : value;
}

/** An element's attributes, by name: `undefined` (or absent) removes one. */
export type AttributeRecord = Readonly<Record<string, string | undefined>>;

/**
 * Keeps a part's attributes on its element: the core's record for the part
 * (`data-calendar-part`, the model's `data-*`, the engine's `role` and `tabindex`): sets the ones
 * given, removes the ones no longer given. A host binding is static; these follow the model and
 * the engine (a state attribute comes and goes with a gesture). Never writes `"false"`.
 */
export function bindAttributes(
    element: Element,
    attributes: () => AttributeRecord,
    injector?: Injector,
): void {
    let applied = new Set<string>();
    effect(
        () => {
            const next = attributes();
            untracked(() => {
                const now = new Set<string>();
                for (const [name, value] of Object.entries(next)) {
                    if (value === undefined) continue;
                    if (element.getAttribute(name) !== value)
                        element.setAttribute(name, value);
                    now.add(name);
                }
                for (const name of applied) {
                    if (!now.has(name)) element.removeAttribute(name);
                }
                applied = now;
            });
        },
        injector ? { injector } : undefined,
    );
}

/** Structural inline style, camelCase keys (`insetBlockStart`): an undefined value leaves the key alone. */
export type StructuralStyle = Readonly<
    Record<string, string | number | undefined>
>;

const kebab = (key: string) =>
    key.startsWith("--")
        ? key
        : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/**
 * Applies a part's structural style to its element, and keeps it applied as it changes: the keys
 * it sets win over the consumer's static `style` (the directive writes them after the element is
 * created); a key it stops setting gets the consumer's value back. Every other key of the
 * consumer's style is untouched.
 */
export function bindStructuralStyle(
    element: HTMLElement,
    style: () => StructuralStyle | undefined,
    injector?: Injector,
): void {
    /** the keys set now, with the consumer's value they replaced */
    const owned = new Map<string, string>();
    effect(
        () => {
            const next = new Map<string, string>();
            for (const [key, value] of Object.entries(style() ?? {})) {
                if (value !== undefined) next.set(kebab(key), String(value));
            }
            untracked(() => {
                for (const [name, previous] of owned) {
                    if (!next.has(name)) {
                        if (previous === "") element.style.removeProperty(name);
                        else element.style.setProperty(name, previous);
                        owned.delete(name);
                    }
                }
                for (const [name, value] of next) {
                    if (!owned.has(name)) {
                        owned.set(name, element.style.getPropertyValue(name));
                    }
                    if (element.style.getPropertyValue(name) !== value) {
                        element.style.setProperty(name, value);
                    }
                }
                if (element.getAttribute("style") === "") {
                    element.removeAttribute("style");
                }
            });
        },
        injector ? { injector } : undefined,
    );
}
