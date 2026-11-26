import { Component } from "@angular/core";
import { CALENDAR, injectCalendarTitle } from "@fragiola/calendar-angular";
import { LucideChevronLeft, LucideChevronRight } from "@lucide/angular";
import { text } from "../_kit/format";
import * as styles from "./styles";

// The title and the buttons: the title is data (`Intl` parts), the buttons run `view.previous`,
// `view.today` and `view.next`, disabled when the model cannot run them.
@Component({
    selector: "[monthToolbar]",
    imports: [CALENDAR, LucideChevronLeft, LucideChevronRight],
    template: `
        <h2 [class]="styles.title">{{ text(title()) }}</h2>
        <button calendarToday [class]="styles.button">Today</button>
        <button calendarPrevious aria-label="Previous month" [class]="styles.iconButton">
            <svg lucideChevronLeft aria-hidden="true" [class]="styles.flip"></svg>
        </button>
        <button calendarNext aria-label="Next month" [class]="styles.iconButton">
            <svg lucideChevronRight aria-hidden="true" [class]="styles.flip"></svg>
        </button>
        <button calendarViewButton="month" [class]="styles.button">Month</button>
    `,
})
export class Toolbar {
    protected readonly styles = styles;
    protected readonly text = text;
    protected readonly title = injectCalendarTitle();
}
