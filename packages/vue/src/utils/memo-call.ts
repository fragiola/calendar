// A collection part's per-entity call of the app's scoped slot, memoized on the layout's objects
// (D11 keeps a week row, a column, a slot, a list day and a segment the same object while it does
// not change) and on the slot, as packages/react's `MemoCall`. Each call is a component of its
// own: Vue re-renders it when one of its props is another object, and when a reactive value the
// slot read changes (Vue tracks the slot's reads in this component's render), so app state the
// slot reads is never stale and moving one event re-renders the rows and columns it touches.
//
// The slot is React's children function, with Vue's own rule for its identity: a template's slot
// is compiled again on every render of its component, but Vue marks one that reads nothing but its
// scope and reactive state as stable (`SlotFlags.STABLE`, the flag Vue itself skips a child's update
// on), so a stable slot is called through one function for the part's life and only a changed
// layout object calls it again. Any other slot (a dynamic one: under a `v-for` or a `v-if`; a
// render function's, which Vue wraps anew on every render) is compared by identity, so every row
// renders again with it, as a new inline function does in React (`$stable: true` on a render
// function's slots keeps them, Vue's own hint).
import {
    type ComponentInternalInstance,
    defineComponent,
    getCurrentInstance,
    type VNodeChild,
} from "vue";

/** Vue's flag on a template's compiled slots that read only their scope and reactive state. */
const STABLE = 1;

type Slots = Readonly<Record<string, unknown>>;

/**
 * Whether the current component's slots are a template's stable ones: the flag the compiled slots
 * object carries on the component's vnode (Vue keeps it on the instance's slots only when the
 * parent's render is compiled too, and a primitive renders through `h`).
 */
function stable(instance: ComponentInternalInstance | null): boolean {
    const children = instance?.vnode.children as { _?: unknown } | null;
    return children?._ === STABLE;
}

/**
 * @internal the function a collection part passes its calls as `render` (call it in `setup`):
 * one for the part's life when its slots are stable (it calls the slot the part holds now), the
 * slot itself otherwise
 */
export function memoSlot(
    slots: Slots,
    name = "default",
): () => ((scope: never) => VNodeChild) | undefined {
    const instance = getCurrentInstance();
    const call = (scope: never) =>
        (slots[name] as ((scope: never) => VNodeChild) | undefined)?.(scope);
    return () => {
        const slot = slots[name] as ((scope: never) => VNodeChild) | undefined;
        if (!slot) return undefined;
        return stable(instance) ? call : slot;
    };
}

/**
 * @internal the slots a part hands a component it renders itself, keeping their stability: all
 * of them, or `name` as the default slot (`Calendar.Week`'s `#day` to `Calendar.Days`). Call it in
 * the part's render.
 */
export function passSlots(
    slots: Slots,
    name?: string,
): Record<string, unknown> {
    const passed = name === undefined ? { ...slots } : { default: slots[name] };
    return stable(getCurrentInstance()) ? { ...passed, _: STABLE } : passed;
}

/** @internal the names of a call's scope (`["day", "week"]`): one constant per collection part */
export type ScopeNames = readonly [string] | readonly [string, string];

/** @internal what a call takes: the slot, the names of its scope and the scope's values */
export interface MemoCallProps {
    /** the slot function (called with `{ [names[0]]: a, [names[1]]: b }`) */
    render?: ((scope: never) => VNodeChild) | undefined;
    names: ScopeNames;
    a?: unknown;
    b?: unknown;
}

/** @internal `render({ [names[0]]: a, [names[1]]: b })`, called again only when a prop changed */
export const MemoCall = defineComponent(
    (props: MemoCallProps) => () => {
        const [first, second] = props.names;
        const scope: Record<string, unknown> = { [first]: props.a };
        if (second !== undefined) scope[second] = props.b;
        const render = props.render as
            | ((scope: Record<string, unknown>) => VNodeChild)
            | undefined;
        return render?.(scope);
    },
    { name: "CalendarMemoCall", props: ["render", "names", "a", "b"] },
);
