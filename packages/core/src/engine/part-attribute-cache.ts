// The engine's part attributes, memoised per part (Issue #24): an adapter asks for every part it
// shows on each view change, and most changes touch few parts or none (a drag's preview moving
// touches no part's attributes). A part's attributes are three layers, each kept with the inputs it
// was read from:
// - the model's (`baseAttributes`): read again only when the model's state, "today" or the host's
//   zone changed;
// - the focus's (`tabindex`, `data-focused`, focusable parts only): read again when the tab stop or
//   the focused position changed;
// - the features' engine state (`data-dragging`, `data-selected`, the now indicator's): written
//   again on a view change whose scope may change it (`gesture`, `selection`, `layout`; never
//   `preview` or `focus`).
// A part whose layers give the same record as before keeps its record: the same object while its
// attributes are the same, so an adapter compares them by identity.
import type { FeatureEngine } from "../features/engine-types";
import type { PartAttributes } from "../features/types";
import type { CalendarModel } from "../model/calendar-model";
import { resolveTimeZone } from "../time-zone/resolve-time-zone";
import type { PartName, ViewChange } from "./adapter";
import type { FocusPosition } from "./grid-point";
import {
    type BaseAttributes,
    baseAttributes,
    composeAttributes,
    type FocusView,
    focusAttributesOf,
    type PartAttributeOptions,
} from "./part-attributes";
import { keyOfPosition } from "./positions";

/** What the cache reads of its engine. */
export interface PartAttributeSource {
    readonly model: CalendarModel;
    readonly features: readonly FeatureEngine[];
    /** today, as an epoch day (the model's clock) */
    today(): number;
    /** the engine's focus position, compared by identity: a new one asks `focusView` again */
    focusPosition(): FocusPosition | null;
    /** the focus as the attributes read it */
    focusView(): FocusView;
}

interface Entry {
    base: BaseAttributes;
    baseStamp: number;
    focus: PartAttributes | undefined;
    focusStamp: number;
    overlayStamp: number;
    result: PartAttributes;
}

/** Parts kept before the cache starts over (a view shows a few hundred). */
const MAX_PARTS = 5000;
/** No focus read yet. */
const UNREAD = Symbol("unread");

/** The same attributes: the same keys with the same values. */
function sameAttributes(a: PartAttributes, b: PartAttributes): boolean {
    let count = 0;
    for (const key in a) {
        if (!Object.hasOwn(b, key) || a[key] !== b[key]) return false;
        count++;
    }
    return count === Object.keys(b).length;
}

/** The key of a part: its name, its payload's values and the options that change it. */
function partKey(
    part: PartName,
    payload: Readonly<Record<string, unknown>>,
    options: PartAttributeOptions | undefined,
): string {
    let key: string = part;
    for (const name in payload) {
        key += `\u0001${name}=${String(payload[name])}`;
    }
    return options?.weekNumberColumn === true ? `${key}\u0001#` : key;
}

/** One engine's memoised part attributes. */
export class PartAttributeCache {
    private readonly source: PartAttributeSource;
    private readonly entries = new Map<string, Entry>();
    private state: unknown = UNREAD;
    private today = Number.NaN;
    private zone = "";
    private baseStamp = 0;
    private focusSource: FocusPosition | null | typeof UNREAD = UNREAD;
    private focusBase = -1;
    private focusSignature = "";
    private focusStamp = 0;
    private focus: FocusView = { tabStop: () => null, focused: null };
    private overlayStamp = 0;

    constructor(source: PartAttributeSource) {
        this.source = source;
    }

    /**
     * The view changed: the features' engine state may have (`gesture`, `selection`, `layout`: the
     * clock), and a measurement may have hidden the focused event (`layout`).
     */
    viewChanged(change: ViewChange): void {
        if (change.gesture || change.selection || change.layout) {
            this.overlayStamp++;
        }
        if (change.layout) this.focusSource = UNREAD;
    }

    /** A part's attributes: the record it had while nothing it reads changed. */
    read(
        part: PartName,
        payload: Readonly<Record<string, unknown>>,
        options: PartAttributeOptions | undefined,
    ): PartAttributes {
        this.syncBase();
        const key = partKey(part, payload, options);
        const entry = this.entries.get(key);
        const { model, features } = this.source;
        let base: BaseAttributes;
        if (entry && entry.baseStamp === this.baseStamp) {
            base = entry.base;
        } else {
            base = baseAttributes(model, part, payload, options);
        }
        const focusStamp = base.focusable ? this.syncFocus() : -1;
        if (
            entry &&
            entry.base === base &&
            entry.focusStamp === focusStamp &&
            entry.overlayStamp === this.overlayStamp
        ) {
            return entry.result;
        }
        const focus = !base.focusable
            ? undefined
            : entry?.base === base && entry.focusStamp === focusStamp
              ? entry.focus
              : focusAttributesOf(model, part, payload, this.focus);
        const made = composeAttributes(base, focus, part, payload, features);
        // frozen: one record is shared by every read while it is the same
        const result =
            entry && sameAttributes(entry.result, made)
                ? entry.result
                : Object.freeze(made);
        if (!entry && this.entries.size >= MAX_PARTS) this.entries.clear();
        this.entries.set(key, {
            base,
            baseStamp: this.baseStamp,
            focus,
            focusStamp,
            overlayStamp: this.overlayStamp,
            result,
        });
        return result;
    }

    /** Moves the base stamp when the model's state, "today" or the host's zone changed. */
    private syncBase(): void {
        const { model } = this.source;
        const state = model.state;
        const today = this.source.today();
        const zone = resolveTimeZone(state.settings.timeZone);
        if (
            state !== this.state ||
            today !== this.today ||
            zone !== this.zone
        ) {
            this.state = state;
            this.today = today;
            this.zone = zone;
            this.baseStamp++;
        }
    }

    /** The focus stamp, moved when the tab stop or the focused position changed. */
    private syncFocus(): number {
        const position = this.source.focusPosition();
        if (
            position === this.focusSource &&
            this.focusBase === this.baseStamp
        ) {
            return this.focusStamp;
        }
        this.focusSource = position;
        this.focusBase = this.baseStamp;
        const view = this.source.focusView();
        const stop = view.tabStop();
        const signature = `${stop ? keyOfPosition(stop) : ""}\u0000${
            view.focused ? keyOfPosition(view.focused) : ""
        }`;
        this.focus = { tabStop: () => stop, focused: view.focused };
        if (signature !== this.focusSignature) {
            this.focusSignature = signature;
            this.focusStamp++;
        }
        return this.focusStamp;
    }
}
