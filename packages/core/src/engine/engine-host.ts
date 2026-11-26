// The engine's host (D16, D21): its timers, frames, `ResizeObserver` and computed styles, never the
// globals. By default every member is the root's `defaultView`'s, read when the root is attached,
// so the same engine runs in a popout window or an iframe; an app or a test injects any of them
// (`createCalendarEngine(model, { host })`): a test drives time with its own timers and clock.

/** A `ResizeObserver` constructor, as a window has it. */
export type ResizeObserverConstructor = new (
    callback: (entries: readonly { readonly target: Element }[]) => void,
) => {
    observe(target: Element): void;
    unobserve(target: Element): void;
    disconnect(): void;
};

/** What the engine schedules and measures with. */
export interface EngineHost {
    /** schedules `callback` in `ms` milliseconds (the midnight refresh, a long press, a tick) */
    setTimeout: (callback: () => void, ms: number) => number;
    clearTimeout: (id: number) => void;
    /** schedules `callback` before the next paint (autoscroll) */
    requestAnimationFrame: (callback: (time: number) => void) => number;
    cancelAnimationFrame: (id: number) => void;
    /** observes the measured elements' sizes (`dayMaxEvents: "auto"`); none: measured on commit only */
    readonly ResizeObserver?: ResizeObserverConstructor | undefined;
    /** the computed style of an element (its `direction`, D14) */
    getComputedStyle: (element: Element) => { readonly direction: string };
}

/** The host members of a window. */
function hostOfView(view: Window): EngineHost {
    const observer = (view as Window & { ResizeObserver?: unknown })
        .ResizeObserver as ResizeObserverConstructor | undefined;
    return {
        setTimeout: (callback, ms) => view.setTimeout(callback, ms),
        clearTimeout: (id) => view.clearTimeout(id),
        requestAnimationFrame: (callback) =>
            typeof view.requestAnimationFrame === "function"
                ? view.requestAnimationFrame(callback)
                : view.setTimeout(() => callback(0), 16),
        cancelAnimationFrame: (id) =>
            typeof view.cancelAnimationFrame === "function"
                ? view.cancelAnimationFrame(id)
                : view.clearTimeout(id),
        ResizeObserver: observer,
        getComputedStyle: (element) => view.getComputedStyle(element),
    };
}

/**
 * The host in effect: the injected members over the root's window's. `undefined` while nothing
 * gives a timer (no root attached and none injected).
 */
export function resolveHost(
    injected: Partial<EngineHost> | undefined,
    root: Element | undefined,
): EngineHost | undefined {
    const view = root?.ownerDocument.defaultView ?? undefined;
    const base = view ? hostOfView(view) : undefined;
    if (!injected) return base;
    const merged = { ...base, ...injected } as Partial<EngineHost>;
    return merged.setTimeout && merged.clearTimeout
        ? ({
              requestAnimationFrame: (callback: (time: number) => void) =>
                  (merged.setTimeout as EngineHost["setTimeout"])(
                      () => callback(0),
                      16,
                  ),
              cancelAnimationFrame: (id: number) =>
                  (merged.clearTimeout as EngineHost["clearTimeout"])(id),
              getComputedStyle: () => ({ direction: "ltr" }),
              ...merged,
          } as EngineHost)
        : undefined;
}
