import { Component, input } from "@angular/core";
import { injectDayHeader } from "@fragiola/calendar-angular";
import { text } from "../_kit/format";

// A column's header shows the weekday and the day (`Intl` parts, the locale's order): on the
// header's element, `<div [calendarColumnHeader]="date" [teamPlannerDayHeader]="date">`.
@Component({
    selector: "[teamPlannerDayHeader]",
    template: "{{ text(parts()) }}",
})
export class DayHeader {
    readonly teamPlannerDayHeader = input.required<string>();
    protected readonly text = text;
    protected readonly parts = injectDayHeader(() =>
        this.teamPlannerDayHeader(),
    );
}
