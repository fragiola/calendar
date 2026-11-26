import { Component } from "@angular/core";
import { CALENDAR, injectCalendarTitle } from "@fragiola/calendar-angular";
import { LucideChevronLeft, LucideChevronRight } from "@lucide/angular";
import { text } from "../_kit/format";
import * as styles from "./styles";

// The title (the view's days, as `Intl` parts) and the navigation buttons: inside the root, so
// `injectCalendarTitle` reads its calendar.
@Component({
    selector: "[allDayAndMultiDayToolbar]",
    imports: [CALENDAR, LucideChevronLeft, LucideChevronRight],
    template: `
        <h2 [class]="styles.title">{{ text(title()) }}</h2>
        <button calendarToday [class]="styles.button">Today</button>
        <button calendarPrevious aria-label="Previous" [class]="styles.iconButton">
            <svg lucideChevronLeft aria-hidden="true" [class]="styles.flip"></svg>
        </button>
        <button calendarNext aria-label="Next" [class]="styles.iconButton">
            <svg lucideChevronRight aria-hidden="true" [class]="styles.flip"></svg>
        </button>
        <fieldset aria-label="View" [class]="styles.views">
            <button calendarViewButton="month" [class]="styles.viewButton">Month</button>
            <button calendarViewButton="week" [class]="styles.viewButton">Week</button>
        </fieldset>
    `,
})
export class Toolbar {
    protected readonly styles = styles;
    protected readonly text = text;
    protected readonly title = injectCalendarTitle();
}
