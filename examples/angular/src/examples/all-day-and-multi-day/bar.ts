import { Component } from "@angular/core";
import { injectCalendar, injectSegment } from "@fragiola/calendar-angular";
import { LucideChevronLeft, LucideChevronRight } from "@lucide/angular";
import type { Types } from "../_kit/data";
import { titleOf } from "../_kit/format";
import * as styles from "./styles";

// A day-grid segment's content: square ends where the event goes on in another row, an arrow
// there. On the segment's element (`<div [calendarSegment]="segment" allDayAndMultiDayBar>`), it
// reads the segment's state.
@Component({
    selector: "[allDayAndMultiDayBar]",
    imports: [LucideChevronLeft, LucideChevronRight],
    template: `
        @if (segment.state(); as state) {
            <span [class]="styles.bar">
                @if (state.continuesBefore) {
                    <svg lucideChevronLeft aria-hidden="true" [class]="styles.arrow"></svg>
                }
                <span [class]="styles.barTitle">{{ titleOf(model(), state.occurrenceId, state.eventId) }}</span>
                @if (state.continuesAfter) {
                    <svg lucideChevronRight aria-hidden="true" [class]="styles.arrow"></svg>
                }
            </span>
        }
    `,
})
export class Bar {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly segment = injectSegment();
    protected readonly model = injectCalendar<Types>().model;
}
