// The scopes of a view change (Issue #24): which parts' attributes each may change, so an adapter
// re-reads only those (`engine.adapter.affects`). The features' state (`data-dragging`,
// `data-selected`, a feature an app defines) may be on any part, so a change the engine cannot
// scope (`gesture`, `layout`) reaches every part.
import type { PartName, ViewChange, ViewScope } from "./adapter";

/** The parts that hold the grid's roving tab stop. */
const FOCUSABLE: ReadonlySet<PartName> = new Set(["day", "slot", "event"]);
/** The parts a selection in the making marks. */
const SELECTED: ReadonlySet<PartName> = new Set(["day", "slot", "selection"]);

/** A view change of these scopes, every other scope off. */
export function viewChangeOf(scopes: Iterable<ViewScope>): ViewChange {
    const change = {
        focus: false,
        gesture: false,
        preview: false,
        selection: false,
        layout: false,
    };
    for (const scope of scopes) change[scope] = true;
    return change;
}

/** Whether a view change may change a part's attributes. */
export function affects(change: ViewChange, part: PartName): boolean {
    return (
        change.layout ||
        change.gesture ||
        (change.focus && FOCUSABLE.has(part)) ||
        (change.selection && SELECTED.has(part)) ||
        (change.preview && part === "drag-preview")
    );
}
