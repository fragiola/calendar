import { Directive, effect, output, untracked } from "@angular/core";
import type { CalendarEngineEventOf } from "@fragiola/calendar";
import {
    injectCalendarContext,
    onDestroy,
} from "@fragiola/calendar-angular/internal";

/**
 * The root's drop event (React's `onEventDrop` on `Root`), on the root's element, with
 * `dragAndDrop()` or `resize()` in the model's features: `<div calendarRoot [features]="features"
 * calendarDragAndDrop (eventDrop)="dropped($event)">` (or `calendarResize`, the same directive:
 * both attributes on one root still emit each drop once). Without either feature installed, it
 * warns once and is never emitted.
 */
@Directive({
    selector:
        "[calendarRoot][calendarDragAndDrop], [calendarRoot][calendarResize]",
    exportAs: "calendarDragAndDrop",
})
export class CalendarDragAndDropRootDirective {
    /** an event was dropped or resized (a pointer, or the keyboard's Enter): `drop` */
    readonly eventDrop = output<CalendarEngineEventOf<"drop">>();

    constructor() {
        const context = injectCalendarContext(
            "[calendarDragAndDrop], [calendarResize]",
        );
        onDestroy(
            context.publicEngine.subscribe((event) => {
                if (event.type === "drop") this.eventDrop.emit(event);
            }),
        );
        effect(() => {
            const installed = context.installed();
            if (installed.has("drag-and-drop") || installed.has("resize")) {
                return;
            }
            untracked(() =>
                context.warn(
                    "(eventDrop) needs the drag-and-drop or resize feature (in the model's features): it is never emitted",
                ),
            );
        });
    }
}
