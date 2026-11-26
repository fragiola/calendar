import { Component, input } from "@angular/core";
import { injectDayHeader } from "@fragiola/calendar-angular";
import { text } from "../_kit/format";

// A column's header shows the weekday and the day (`Intl` parts, the locale's order): on the
// header's element, `<div [calendarColumnHeader]="date" [undoRedoDayHeader]="date">`.
@Component({
    selector: "[undoRedoDayHeader]",
    template: "{{ text(parts()) }}",
})
export class DayHeader {
    readonly undoRedoDayHeader = input.required<string>();
    protected readonly text = text;
    protected readonly parts = injectDayHeader(() => this.undoRedoDayHeader());
}
