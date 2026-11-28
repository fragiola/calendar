// A collection part's per-entity call of the app's children function, memoized on the function and
// the layout's objects (D11 keeps a week row, a column, a slot, a list day and a segment the same
// object while it does not change). React's own contract: an entity's call runs again when its
// layout object or the children function changes, so app state the function closes over is never
// stale. An inline function is a new one on every render of the app, which re-renders every row;
// a stable one (`useCallback`) re-renders only the rows whose layout changed, so moving one event
// re-renders the rows and columns it touches.
import * as React from "react";

interface MemoCallProps {
    /** the children function */
    render: (...args: never[]) => React.ReactNode;
    /** its arguments: the call runs again when one of them, or `render`, is another object */
    args: readonly unknown[];
}

function same(a: MemoCallProps, b: MemoCallProps): boolean {
    return (
        a.render === b.render &&
        a.args.length === b.args.length &&
        a.args.every((arg, index) => Object.is(arg, b.args[index]))
    );
}

/** @internal `render(...args)`, called again only when `render` or an argument changed */
export const MemoCall = React.memo(function MemoCall(props: MemoCallProps) {
    const call = props.render as (
        ...args: readonly unknown[]
    ) => React.ReactNode;
    return <>{call(...props.args)}</>;
}, same);

/**
 * @internal `MemoCall`'s contract without a component per entity, for a collection called many
 * times per row (a slot row's days): each entity's call runs again only when `render` or the
 * entity changed, else its last element is given again (the same object, which React skips)
 */
export function useEntityCalls<E>(
    render: (entity: E) => React.ReactNode,
    entities: readonly E[],
    keyOf: (entity: E, index: number) => string,
): React.ReactNode[] {
    const cache = React.useRef(
        new Map<
            string,
            {
                render: (entity: E) => React.ReactNode;
                entity: E;
                node: React.ReactNode;
            }
        >(),
    );
    const next = new Map<
        string,
        {
            render: (entity: E) => React.ReactNode;
            entity: E;
            node: React.ReactNode;
        }
    >();
    const nodes = entities.map((entity, index) => {
        const key = keyOf(entity, index);
        const previous = cache.current.get(key);
        const call =
            previous?.render === render && Object.is(previous.entity, entity)
                ? previous
                : { render, entity, node: render(entity) };
        next.set(key, call);
        return <React.Fragment key={key}>{call.node}</React.Fragment>;
    });
    cache.current = next;
    return nodes;
}
