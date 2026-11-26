import { Directive, effect, output, untracked } from "@angular/core";
import type { CalendarEngineEventOf } from "@fragiola/calendar";
import {
    injectCalendarContext,
    onDestroy,
} from "@fragiola/calendar-angular/internal";

/**
 * The root's selection event (React's `onSelect` on `Root`), on the root's element, with
 * `selection()` in the model's features: `<div calendarRoot [features]="features"
 * calendarSelection (rangeSelect)="selected($event)">`. Named `rangeSelect`, not `select`: an
 * element's `(select)` also hears the DOM's `select` event of the fields inside it. Without
 * `selection()` installed, it warns once and is never emitted.
 */
@Directive({
    selector: "[calendarRoot][calendarSelection]",
    exportAs: "calendarSelection",
})
export class CalendarSelectionRootDirective {
    /** a range was selected (a pointer, or Shift + arrows and Enter): `select` */
    readonly rangeSelect = output<CalendarEngineEventOf<"select">>();

    constructor() {
        const context = injectCalendarContext("[calendarSelection]");
        onDestroy(
            context.publicEngine.subscribe((event) => {
                if (event.type === "select") this.rangeSelect.emit(event);
            }),
        );
        effect(() => {
            if (context.installed().has("selection")) return;
            untracked(() =>
                context.warn(
                    "(rangeSelect) needs the selection feature (in the model's features): it is never emitted",
                ),
            );
        });
    }
}
