// The views the calendar's template directives render, one per entity, keyed.
//
// `SlotViews` (a collection part's per-entity template: a week row, a day, a slot, a column, a
// segment): each view in a root view of its own (Flow's `FlowSlot`), its elements placed before
// the template's anchor. Angular refreshes a template's embedded views with their component (a
// signal read in one marks the component), so a row's view in the app's component would be
// checked again whenever any row changed; in a view of its own, only the view whose context
// changed is (D11, React's `MemoCall`). The views are still checked whenever the template they
// are in is (`markForCheck` from the directive's `ngDoCheck`), as embedded views are, so app state
// a template reads is never stale.
//
// `PartViews` (a part rendered only in some states, or once per segment: `*calendarMore`,
// `*calendarSelection`, …): embedded views in place, each binding the part to its first element.
//
// `SignalContext` and `SlotViews` are from Flow (fragiola/flow,
// packages/angular/src/lib/utils/views.ts, its `SignalContext` Dockable's), same author and
// licence.
import {
    ApplicationRef,
    ChangeDetectionStrategy,
    Component,
    type ComponentRef,
    createComponent,
    type DestroyableInjector,
    type EmbeddedViewRef,
    EnvironmentInjector,
    Injector,
    inject,
    signal,
    type TemplateRef,
    untracked,
    ViewContainerRef,
    type WritableSignal,
} from "@angular/core";

/**
 * A template context whose fields are signals behind getters: a view reads them while it renders,
 * so setting a field renders that view again, and nothing else.
 */
export class SignalContext<V extends object> {
    private readonly fields: { [K in keyof V]: WritableSignal<V[K]> };

    constructor(initial: V) {
        const fields = {} as { [K in keyof V]: WritableSignal<V[K]> };
        for (const key of Object.keys(initial) as (keyof V)[]) {
            fields[key] = signal(initial[key]);
            Object.defineProperty(this, key, {
                enumerable: true,
                get: () => fields[key](),
            });
        }
        this.fields = fields;
    }

    /** Sets the fields that changed. */
    update(next: V): void {
        for (const key of Object.keys(next) as (keyof V)[]) {
            const field = this.fields[key];
            if (field && !Object.is(untracked(field), next[key])) {
                field.set(next[key]);
            }
        }
    }
}

/** A {@link SignalContext}, seen as the context type its template declares. */
export function signalContext<V extends object>(
    initial: V,
): SignalContext<V> & V {
    return new SignalContext(initial) as SignalContext<V> & V;
}

/**
 * The root view an entity's view lives in: a component with no template whose host stays out of
 * the document; its container (next to its host) holds the entity's view, whose elements are
 * moved to their place.
 */
@Component({
    selector: "calendar-slot",
    template: "",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarSlot {
    /** where the entity's view is created */
    readonly container = inject(ViewContainerRef);
}

interface Slot<C extends object> {
    readonly ref: ComponentRef<CalendarSlot>;
    /** where its view's elements are made, out of the document */
    readonly box: HTMLElement;
    readonly view: EmbeddedViewRef<SignalContext<C> & C>;
}

/** An entity's view to show: its key and its template context. */
export interface ViewItem<C extends object> {
    readonly key: string;
    readonly context: C;
}

/** The views of a template, one per key, each in a root view of its own, placed before `anchor`. */
export class SlotViews<C extends object> {
    private readonly slots = new Map<string, Slot<C>>();
    private readonly app = inject(ApplicationRef);
    private readonly environmentInjector = inject(EnvironmentInjector);
    private readonly elementInjector = inject(Injector);

    constructor(
        private readonly anchor: Comment,
        private readonly template: TemplateRef<C>,
    ) {}

    /**
     * Brings the views to `items`, in their order before the anchor: a key that stays keeps its
     * view and its elements (its context updated: only a changed field renders it again), a new
     * key creates one, a key that goes destroys its view.
     */
    sync(items: readonly ViewItem<C>[]): void {
        untracked(() => {
            const keep = new Set(items.map((item) => item.key));
            for (const [key, slot] of this.slots) {
                if (!keep.has(key)) {
                    slot.ref.destroy();
                    this.slots.delete(key);
                }
            }
            const ordered: Slot<C>[] = [];
            for (const { key, context } of items) {
                let slot = this.slots.get(key);
                if (slot) {
                    slot.view.context.update(context);
                } else {
                    slot = this.create(context);
                    this.slots.set(key, slot);
                }
                ordered.push(slot);
            }
            // in order, from the last: each view's nodes before the next one's
            const parent = this.anchor.parentNode;
            let next: Node = this.anchor;
            for (let i = ordered.length - 1; i >= 0; i--) {
                const slot = ordered[i];
                if (!slot) continue;
                const nodes = (slot.view.rootNodes as Node[]).filter(
                    (node) =>
                        node.parentNode === parent ||
                        node.parentNode === slot.box,
                );
                const last = nodes.at(-1);
                if (last && last.nextSibling !== next) {
                    for (const node of nodes) parent?.insertBefore(node, next);
                }
                next = nodes[0] ?? next;
            }
        });
    }

    /** Has every view checked with the next render (the template they are in was). */
    markForCheck(): void {
        for (const slot of this.slots.values()) {
            slot.ref.changeDetectorRef.markForCheck();
        }
    }

    clear(): void {
        for (const slot of this.slots.values()) slot.ref.destroy();
        this.slots.clear();
    }

    private create(context: C): Slot<C> {
        const document = this.anchor.ownerDocument;
        // the slot's host, and the view next to it, stay out of the document
        const box = document.createElement("div");
        const host = document.createElement("calendar-slot");
        // `appendChild`: a server render's DOM (Domino) has no `append`
        box.appendChild(host);
        const ref = createComponent(CalendarSlot, {
            environmentInjector: this.environmentInjector,
            elementInjector: this.elementInjector,
            hostElement: host,
        });
        this.app.attachView(ref.hostView);
        const view = ref.instance.container.createEmbeddedView(
            this.template as unknown as TemplateRef<SignalContext<C> & C>,
            signalContext(context),
        );
        ref.changeDetectorRef.markForCheck();
        return { ref, box, view };
    }
}

interface PartView<C extends object> {
    readonly view: EmbeddedViewRef<SignalContext<C> & C>;
    /** the injector of what binds its element (effects, the registration), destroyed with it */
    readonly injector: DestroyableInjector;
}

/**
 * A structural part's views, one per key, in place (its template's container), in order. Each new
 * view's first element is the part's element: `bind` binds it (its attributes, its structural
 * style, its registration) with an injector destroyed with the view, and with the view's context.
 */
export class PartViews<C extends object> {
    private readonly views = new Map<string, PartView<C>>();
    private readonly injector = inject(Injector);

    constructor(
        private readonly container: ViewContainerRef,
        private readonly template: TemplateRef<C>,
        private readonly bind: (
            element: HTMLElement,
            context: SignalContext<C> & C,
            injector: Injector,
        ) => void,
    ) {}

    sync(items: readonly ViewItem<C>[]): void {
        untracked(() => {
            const keep = new Set(items.map((item) => item.key));
            for (const [key, part] of this.views) {
                if (!keep.has(key)) {
                    this.destroy(part);
                    this.views.delete(key);
                }
            }
            items.forEach((item, index) => {
                const part = this.views.get(item.key);
                if (part) {
                    part.view.context.update(item.context);
                    if (this.container.indexOf(part.view) !== index) {
                        this.container.move(part.view, index);
                    }
                    return;
                }
                const context = signalContext(item.context);
                const view = this.container.createEmbeddedView(
                    this.template as unknown as TemplateRef<
                        SignalContext<C> & C
                    >,
                    context,
                    index,
                );
                const injector = Injector.create({
                    providers: [],
                    parent: this.injector,
                });
                const element = (view.rootNodes as Node[]).find(
                    (node): node is HTMLElement => node.nodeType === 1,
                );
                if (element) this.bind(element, context, injector);
                this.views.set(item.key, { view, injector });
            });
        });
    }

    clear(): void {
        for (const part of this.views.values()) this.destroy(part);
        this.views.clear();
    }

    private destroy(part: PartView<C>): void {
        part.injector.destroy();
        part.view.destroy();
    }
}
