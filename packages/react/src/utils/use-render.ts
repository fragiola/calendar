// From Tree (fragiola/tree, packages/react/src/utils/use-render.ts, its copy of Dockable's), same
// author and licence.
import * as React from "react";
import { mergeProps } from "./merge-props";

/** A callback ref that forwards to every ref in `refs` (function refs and ref objects alike). */
function mergeRefs<T>(
    ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
    return (value) => {
        const cleanups = refs.map((ref) => {
            if (typeof ref === "function") {
                const cleanup = ref(value);
                return typeof cleanup === "function"
                    ? cleanup
                    : () => ref(null);
            }
            if (ref) {
                ref.current = value;
                return () => {
                    ref.current = null;
                };
            }
            return undefined;
        });
        return () => {
            for (const cleanup of cleanups) {
                cleanup?.();
            }
        };
    };
}

/**
 * Props a `render` function receives: spread them onto the element it returns. `ref` is a callback
 * ref, so it fits any element's `ref` (`render={(props) => <section {...props} />}` needs no cast).
 */
export type RenderedProps<E extends Element = HTMLElement> =
    React.HTMLAttributes<E> & {
        ref: React.RefCallback<E>;
        [dataAttribute: `data-${string}`]: string | undefined;
    };

/**
 * Replaces the element a primitive renders, Base UI style: either an element whose props are
 * merged with the primitive's (`render={<section />}`), or a function receiving the props and
 * the primitive's state (`render={(props, state) => <section {...props} />}`).
 */
export type RenderProp<State, E extends Element = HTMLElement> =
    | React.ReactElement
    | ((props: RenderedProps<E>, state: State) => React.ReactElement);

/** The props every primitive accepts on top of the element's own. */
export interface PrimitiveProps<State> {
    /** replaces the rendered element (never `asChild`) */
    render?: RenderProp<State> | undefined;
    /** a class name, or a function of the primitive's state returning one */
    className?: string | ((state: State) => string | undefined) | undefined;
    /**
     * a style, or a function of the primitive's state returning one. Structural keys the
     * primitive sets (position, geometry, display, flex sizing) always win.
     */
    style?:
        | React.CSSProperties
        | ((state: State) => React.CSSProperties | undefined)
        | undefined;
    ref?: React.Ref<HTMLElement> | undefined;
}

type DivProps = Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "className" | "style" | "children"
>;

/** The props of a primitive that renders a `div` by default. */
export type DivPrimitiveProps<State> = PrimitiveProps<State> & DivProps;

/** The props of a primitive that renders a `button` by default. */
export type ButtonPrimitiveProps<State> = PrimitiveProps<State> &
    Omit<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        "className" | "style" | "children"
    >;

/** The props of a primitive that renders a `span` by default. */
export type SpanPrimitiveProps<State> = PrimitiveProps<State> &
    Omit<
        React.HTMLAttributes<HTMLSpanElement>,
        "className" | "style" | "children"
    >;

/** `data-*` attributes from a record: `true` → present (empty), `false`/`undefined` → absent. */
export function dataAttributes(
    record: Record<string, string | number | boolean | undefined>,
) {
    const attributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
        if (value === true) {
            attributes[`data-${key}`] = "";
        } else if (value !== false && value !== undefined) {
            attributes[`data-${key}`] = String(value);
        }
    }
    return attributes;
}

type AnyProps = Record<string, unknown>;

/** What stands for any callback ref in the merged ref's identity (see `useRenderElement`). */
const CALLBACK_REF = {};

/**
 * A consumer ref's part in the merged ref's identity: a ref object by itself (swapping one for
 * another re-attaches, so the new one receives the element), any callback alike (an inline one is
 * new each render and must not re-attach), nothing for no ref.
 */
function refIdentity(ref: React.Ref<HTMLElement> | undefined): object | null {
    if (ref == null) return null;
    return typeof ref === "function" ? CALLBACK_REF : ref;
}

interface RenderOptions<State> {
    state: State;
    /** the primitive's own props: ARIA, data-*, handlers, children */
    props: Record<string, unknown>;
    /** the primitive's ref, merged with the consumer's */
    ref?: React.Ref<HTMLElement> | undefined;
    /** structural style: always wins over the consumer's */
    style?: React.CSSProperties | undefined;
}

/**
 * Renders a primitive's element: resolves `className`/`style` functions against the state,
 * merges the consumer's props over the primitive's (handlers composed, internal first; structural
 * style keys win), merges refs, and applies `render`.
 */
export function useRenderElement<State>(
    tag: keyof React.JSX.IntrinsicElements,
    componentProps: PrimitiveProps<State>,
    options: RenderOptions<State>,
): React.JSX.Element {
    const {
        render,
        className,
        style,
        ref: externalRef,
        ...external
    } = componentProps as PrimitiveProps<State> & AnyProps;
    const internalRef = options.ref;
    // the render element's own ref joins the merge; memoized so React does not detach and
    // re-attach the refs (and the primitive's registrations) on every render
    const renderElement =
        render && typeof render !== "function"
            ? (render as React.ReactElement<AnyProps>)
            : undefined;
    const elementRef = renderElement?.props.ref as
        | React.Ref<HTMLElement>
        | undefined;
    // consumer callback refs are read when the element attaches, not memoized on their identity:
    // an inline callback ref (a new function each render) must not make React detach and
    // re-attach the primitive's own ref (and its registrations) on every render. A ref object is
    // part of the identity: a new one re-attaches (the old one is cleared, the new one set), and
    // so does a ref that appears or goes away
    const consumerRefs = React.useRef<(React.Ref<HTMLElement> | undefined)[]>(
        [],
    );
    consumerRefs.current = [externalRef, elementRef];
    const externalIdentity = refIdentity(externalRef);
    const elementIdentity = refIdentity(elementRef);
    const ref = React.useMemo<React.RefCallback<HTMLElement>>(
        () => (element: HTMLElement | null) =>
            mergeRefs(
                internalRef,
                ...(externalIdentity || elementIdentity
                    ? consumerRefs.current
                    : []),
            )(element),
        [internalRef, externalIdentity, elementIdentity],
    );

    const resolvedClassName =
        typeof className === "function" ? className(options.state) : className;
    const resolvedStyle =
        typeof style === "function" ? style(options.state) : style;

    const props = mergeProps(options.props, external);
    if (resolvedClassName !== undefined) {
        props.className = resolvedClassName;
    }
    if (resolvedStyle || options.style) {
        props.style = { ...resolvedStyle, ...options.style };
    }
    props.ref = ref;

    if (typeof render === "function") {
        return render(props as unknown as RenderedProps, options.state);
    }
    if (renderElement) {
        const elementProps = renderElement.props;
        const merged = mergeProps(props, elementProps);
        if (elementProps.style || props.style) {
            merged.style = {
                ...(elementProps.style as React.CSSProperties),
                ...(props.style as React.CSSProperties),
            };
        }
        merged.ref = ref;
        return React.cloneElement(renderElement, merged);
    }
    return React.createElement(tag, props);
}
