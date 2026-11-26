import { Component, computed } from "@angular/core";
import { injectCalendar, injectCalendarView } from "@fragiola/calendar-angular";
import { DatePicker, type PlainDate } from "#/components/ui/calendar";
import type { Types } from "../_kit/data";

/** A `YYYY-MM-DD` day as the date picker's plain date. */
function plainDate(date: string): PlainDate {
    const [year, month, day] = date.split("-").map(Number);
    return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 };
}

// A mini month to jump around: Fragiola UI's date picker. Its plain dates are the calendar's
// (`{ year, month, day }`): a picked day goes straight to `view.go-to`.
@Component({
    selector: "example-team-planner-mini-month",
    imports: [DatePicker],
    host: { class: "contents" },
    template: `
        <kit-date-picker aria-label="Go to a date" [value]="anchor()" (valueChange)="goTo($event)" />
    `,
})
export class MiniMonth {
    private readonly model = injectCalendar<Types>().model;
    private readonly view = injectCalendarView();
    protected readonly anchor = computed(() =>
        plainDate(this.view().anchorDate),
    );

    protected goTo(date: PlainDate | null) {
        if (date) this.model().run("view.go-to", { date });
    }
}
