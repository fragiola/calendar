// From Tree (fragiola/tree, packages/vue/src/utils/render.ts, itself Dockable's), same author and
// licence.
import {
    type Component,
    type CSSProperties,
    camelize,
    type FunctionalComponent,
    getCurrentInstance,
    h,
    mergeProps,
    normalizeStyle,
    onBeforeMount,
    type Slot,
    type VNode,
    type VNodeChild,
} from "vue";

/** The element behind a template ref: the element itself, or a component's root element. */
export function toElement(value: unknown): HTMLElement | null {
    if (value === null || typeof value !== "object") {
        return null;
    }
    // `nodeType`, not `instanceof HTMLElement`: an element may belong to another window (an iframe)
    if ((value as { nodeType?: unknown }).nodeType === 1) {
        return value as HTMLElement;
    }
    const root = (value as { $el?: unknown }).$el;
    return root !== null &&
        typeof root === "object" &&
        (root as { nodeType?: unknown }).nodeType === 1
        ? (root as HTMLElement)
        : null;
}

/** A function template ref, as a primitive puts it on its element. */
export type ElementRef = (value: unknown) => void;

/**
 * A function template ref that calls `attach` with the element once it is mounted, and the
 * cleanup it returns when the element goes away or `deps` change (then `attach` runs again). Vue
 * calls a function ref on every patch; only a change reaches `attach`.
 */
export function elementRef(
    attach: (element: HTMLElement) => (() => void) | undefined,
    deps: () => readonly unknown[] = () => [],
): ElementRef {
    let current: HTMLElement | null = null;
    let currentDeps: readonly unknown[] = [];
    let cleanup: (() => void) | undefined;
    return (value: unknown) => {
        const element = toElement(value);
        const next = element ? deps() : [];
        if (
            element === current &&
            next.length === currentDeps.length &&
            next.every((dep, i) => Object.is(dep, currentDeps[i]))
        ) {
            return;
        }
        cleanup?.();
        cleanup = undefined;
        current = element;
        currentDeps = next;
        if (element) {
            cleanup = attach(element);
        }
    };
}

/**
 * Runs `start` on the client only: before the component mounts (a server render never mounts, so
 * it never subscribes to anything it could not unsubscribe from), or at once outside a component.
 * What `start` creates (a watcher, an `onScopeDispose`) belongs to the component and ends with it.
 */
export function onClient(start: () => void): void {
    if (getCurrentInstance()) {
        onBeforeMount(start);
    } else {
        start();
    }
}

/** A component (or a tag) a primitive renders instead of its own element: the `as` prop. */
export type AsProp = string | Component;

/** What a primitive's `render` scoped slot receives. */
export interface RenderSlotProps<State> {
    /**
     * what goes on your element (`v-bind="props"`): the primitive's ARIA, `data-*`, listeners, its
     * structural style merged over your `class`/`style`, and its template ref
     */
    props: Record<string, unknown>;
    /** the primitive's state */
    state: State;
    /**
     * the primitive's content, as a node of one stable component (`<component :is="children" />`,
     * or `h(children)`): its type never changes between renders, so the content never remounts
     */
    children: VNode;
}

/** Renders a primitive's content inside its `render` slot: one component type for every render. */
const PrimitiveChildren: FunctionalComponent<{
    content?: (() => VNodeChild) | undefined;
}> = (props) => props.content?.();
PrimitiveChildren.props = ["content"];

/** The slots every primitive accepts: `render` replaces its element. */
export interface RenderSlot<State> {
    /** replaces the rendered element (never `asChild`): bind `props` on your own element */
    render?: (scope: RenderSlotProps<State>) => VNode[];
}

interface RenderOptions<State> {
    /** the element rendered by default */
    tag: string;
    /** the consumer's `as` prop */
    as?: AsProp | undefined;
    /** the consumer's fallthrough attributes: `class`, `style`, listeners, ARIA, … */
    attrs: Record<string, unknown>;
    /** the consumer's `render` slot */
    render?: Slot | undefined;
    state: State;
    /** the primitive's own props: ARIA, data-*, listeners */
    props: Record<string, unknown>;
    /** the primitive's template ref */
    ref?: ElementRef | undefined;
    /** structural style: always wins over the consumer's */
    style?: CSSProperties | undefined;
    /** the primitive's content */
    children?: (() => VNodeChild) | undefined;
}

/**
 * Renders a primitive's element: merges the consumer's attributes over the primitive's
 * (listeners composed, internal first; classes joined; structural style keys win), puts the
 * primitive's template ref on it, and applies `as` or the `render` slot.
 */
export function renderElement<State>(
    options: RenderOptions<State>,
): VNodeChild {
    const { attrs, state, children } = options;
    // one pass over the attributes (a time grid renders hundreds of cells, Epic #27)
    let consumerStyle: unknown;
    const external: Record<string, unknown> = {};
    for (const key in attrs) {
        if (key === "style") consumerStyle = attrs[key];
        else external[key] = attrs[key];
    }
    const merged = mergeProps(options.props, external);
    if (consumerStyle !== undefined || options.style !== undefined) {
        // structural keys win, an undefined one included (it removes the consumer's, as in React)
        const style: Record<string, unknown> = {
            ...styleObject(consumerStyle),
            ...options.style,
        };
        for (const key in style) {
            if (style[key] === undefined) delete style[key];
        }
        if (Object.keys(style).length > 0) merged.style = style;
    }
    if (options.ref) {
        merged.ref = options.ref;
    }
    if (options.render) {
        return options.render({
            props: merged,
            state,
            children: h(PrimitiveChildren, { content: children }),
        } satisfies RenderSlotProps<State>);
    }
    const as = options.as ?? options.tag;
    if (typeof as === "string") {
        return h(as, merged, children ? [children()] : undefined);
    }
    return h(as, merged, children ? { default: children } : undefined);
}

/**
 * A consumer's `style` (an object, an array or a CSS string) as one object with camelCase keys
 * (custom properties kept), so the structural keys can win over it.
 */
export function styleObject(style: unknown): Record<string, unknown> {
    const normalized = normalizeStyle(style);
    const result: Record<string, unknown> = {};
    if (typeof normalized === "string") {
        for (const declaration of normalized.split(/;(?![^(]*\))/g)) {
            const index = declaration.indexOf(":");
            if (index > 0) {
                const name = declaration.slice(0, index).trim();
                result[name.startsWith("--") ? name : camelize(name)] =
                    declaration.slice(index + 1).trim();
            }
        }
    } else if (normalized) {
        for (const [name, value] of Object.entries(normalized)) {
            result[name.startsWith("--") ? name : camelize(name)] = value;
        }
    }
    return result;
}
