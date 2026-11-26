// A collection part's per-entity call of the app's children function, memoized on the layout's
// objects (D11 keeps a week row, a column, a slot, a list day and a segment the same object while
// it does not change). A children function is usually written inline, so its identity changes on
// every render of the app: it is read through a ref, so a new function does not re-render the rows
// whose layout object is the same. Moving one event re-renders the rows and columns it touches.
import * as React from "react";

/** @internal the latest value of `value`, in a ref whose identity never changes */
export function useLatest<V>(value: V): { readonly current: V } {
    const ref = React.useRef(value);
    ref.current = value;
    return ref;
}

interface MemoCallProps {
    /** the children function, read when the call runs */
    render: { readonly current: (...args: never[]) => React.ReactNode };
    /** its arguments: the call runs again only when one of them is another object */
    args: readonly unknown[];
}

function same(a: MemoCallProps, b: MemoCallProps): boolean {
    return (
        a.render === b.render &&
        a.args.length === b.args.length &&
        a.args.every((arg, index) => Object.is(arg, b.args[index]))
    );
}

/** @internal `render.current(...args)`, called again only when an argument changed */
export const MemoCall = React.memo(function MemoCall(props: MemoCallProps) {
    const call = props.render.current as (
        ...args: readonly unknown[]
    ) => React.ReactNode;
    return <>{call(...props.args)}</>;
}, same);
