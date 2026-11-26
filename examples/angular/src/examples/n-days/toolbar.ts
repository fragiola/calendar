import { Component } from "@angular/core";
import { CALENDAR, injectCalendarTitle } from "@fragiola/calendar-angular";
import { LucideChevronLeft, LucideChevronRight } from "@lucide/angular";
import { text } from "../_kit/format";
import * as styles from "./styles";

// The title (the view's days, as `Intl` parts) and the navigation buttons: inside the root, so
// `injectCalendarTitle` reads its calendar.
@Component({
    selector: "[nDaysToolbar]",
    imports: [CALENDAR, LucideChevronLeft, LucideChevronRight],
    template: `
        <h2 [class]="styles.title">{{ text(title()) }}</h2>
        <button calendarToday [class]="styles.button">Today</button>
        <button calendarPrevious aria-label="Previous days" [class]="styles.iconButton">
            <svg lucideChevronLeft aria-hidden="true" [class]="styles.flip"></svg>
        </button>
        <button calendarNext aria-label="Next days" [class]="styles.iconButton">
            <svg lucideChevronRight aria-hidden="true" [class]="styles.flip"></svg>
        </button>
        <fieldset aria-label="Days shown" [class]="styles.lengths">
            @for (days of LENGTHS; track days) {
                <button calendarViewButton="days" [days]="days" [class]="styles.length">{{ days }} days</button>
            }
        </fieldset>
    `,
})
export class Toolbar {
    protected readonly styles = styles;
    protected readonly text = text;
    /** How many days the view shows: each button runs `view.set { type: "days", days }`. */
    protected readonly LENGTHS = [3, 4, 5] as const;
    protected readonly title = injectCalendarTitle();
}
