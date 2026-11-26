import { Component, input } from "@angular/core";
import {
    type FormatOptions,
    injectDayHeader,
} from "@fragiola/calendar-angular";
import { text } from "../_kit/format";

// A column's header (`Intl` parts): the weekday and the day, or what `format` asks for. On the
// header's element: `<div [calendarColumnHeader]="date" [allDayAndMultiDayWeekday]="date">`.
@Component({
    selector: "[allDayAndMultiDayWeekday]",
    template: "{{ text(parts()) }}",
})
export class Weekday {
    readonly allDayAndMultiDayWeekday = input.required<string>();
    readonly format = input<FormatOptions>();
    protected readonly text = text;
    protected readonly parts = injectDayHeader(
        () => this.allDayAndMultiDayWeekday(),
        () => this.format(),
    );
}
