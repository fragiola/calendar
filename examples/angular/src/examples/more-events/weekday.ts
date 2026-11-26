import { Component, input } from "@angular/core";
import { injectDayHeader } from "@fragiola/calendar-angular";
import { text } from "../_kit/format";

// A column's header: the weekday (`Intl` parts), on the header's element.
@Component({
    selector: "[moreEventsWeekday]",
    template: "{{ text(parts()) }}",
})
export class Weekday {
    readonly moreEventsWeekday = input.required<string>();
    protected readonly text = text;
    protected readonly parts = injectDayHeader(() => this.moreEventsWeekday(), {
        weekday: "short",
    });
}
