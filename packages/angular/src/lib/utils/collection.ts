// A collection part's template (`<ng-template calendarWeeks let-week>`, React's children
// function, Vue's scoped slot): one view per entity, keyed, each a root view of its own
// (`SlotViews`), its context the layout's objects. D11 keeps a week row, a day, a slot, a column, a
// segment and a list day the same object while it does not change, so moving an event renders
// again only the views whose objects changed; the views are checked again whenever the template
// they are in is (the directive's `ngDoCheck`), so app state a template reads is never stale.
import {
    effect,
    inject,
    type ProviderToken,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core";
import {
    onDestroy,
    SlotViews,
    type ViewItem,
} from "@fragiola/calendar-angular/internal";

/** The views of the template directive being created, synced with `items` (call it in its constructor). */
export function bindCollection<C extends object>(
    items: () => readonly ViewItem<C>[],
): SlotViews<C> {
    const anchor = inject(ViewContainerRef).element.nativeElement as Comment;
    const views = new SlotViews<C>(anchor, inject<TemplateRef<C>>(TemplateRef));
    effect(() => views.sync(items()));
    onDestroy(() => views.clear());
    return views;
}

/** The enclosing directive a template directive renders for, or the error naming where it belongs. */
export function injectParent<D>(
    type: ProviderToken<D>,
    part: string,
    inside: string,
): D {
    const parent = inject(type, { optional: true });
    if (!parent) throw new Error(`${part} must be used inside ${inside}`);
    return parent;
}
