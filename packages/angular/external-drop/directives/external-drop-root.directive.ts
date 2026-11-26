import { Directive, effect, output, untracked } from "@angular/core";
import type { CalendarEngineEventOf } from "@fragiola/calendar";
import {
    injectCalendarContext,
    onDestroy,
} from "@fragiola/calendar-angular/internal";

/**
 * The root's external drop event (React's `onExternalDrop` on `Root`), on the root's element, with
 * `externalDrop()` in the model's features: `<div calendarRoot [features]="features"
 * calendarExternalDrop (externalDrop)="received($event)">`. Its drags preview through
 * `*calendarDragPreview` (`/drag-and-drop`, which it requires). Without `externalDrop()`
 * installed, it warns once and is never emitted.
 */
@Directive({
    selector: "[calendarRoot][calendarExternalDrop]",
    exportAs: "calendarExternalDrop",
})
export class CalendarExternalDropRootDirective {
    /** something from outside the calendar was dropped on it: `external-drop` */
    readonly externalDrop = output<CalendarEngineEventOf<"external-drop">>();

    constructor() {
        const context = injectCalendarContext("[calendarExternalDrop]");
        onDestroy(
            context.publicEngine.subscribe((event) => {
                if (event.type === "external-drop") {
                    this.externalDrop.emit(event);
                }
            }),
        );
        effect(() => {
            if (context.installed().has("external-drop")) return;
            untracked(() =>
                context.warn(
                    "(externalDrop) needs the external-drop feature (in the model's features): it is never emitted",
                ),
            );
        });
    }
}
