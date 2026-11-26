import { Component, input } from "@angular/core";
import { injectDayHeader } from "@fragiola/calendar-angular";
import { text } from "../_kit/format";

// A column's header shows the weekday and the day (`Intl` parts, the locale's order): on the
// header's element, `<div [calendarColumnHeader]="date" [editRulesDayHeader]="date">`.
@Component({
    selector: "[editRulesDayHeader]",
    template: "{{ text(parts()) }}",
})
export class DayHeader {
    readonly editRulesDayHeader = input.required<string>();
    protected readonly text = text;
    protected readonly parts = injectDayHeader(() => this.editRulesDayHeader());
}
