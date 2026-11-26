import { Component, input, output } from "@angular/core";
import { CALENDAR, injectCalendar } from "@fragiola/calendar-angular";
import { POPOVER, type PopoverOpenChange } from "#/components/ui/popover";
import type { Types } from "../_kit/data";
import { dayText, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// The popover of a day: its trigger is the day's "+N more" (rendered only while some events do
// not fit). The engine's `more-click` opens it (the root's `(moreClick)`); a press on the trigger
// is that click, so the trigger's own toggle is ignored (React cancels its `trigger-press`), and
// Escape or a press outside close it. Inside the day: `<example-more-popover [date]="day.date">`.
@Component({
    selector: "example-more-popover",
    imports: [CALENDAR, POPOVER],
    host: { class: "contents" },
    template: `
        <ng-container kitPopover [open]="open()" (openChange)="onOpenChange($event)">
            <button *calendarMore="let more" kitPopoverTrigger [class]="styles.more">+{{ more.hiddenCount }} more</button>
            <kit-popover-content align="start" [sideOffset]="4" [class]="styles.popover">
                @if (open()) {
                    <div [class]="styles.popoverBody">
                        <h2 kitPopoverTitle [class]="styles.popoverTitle">{{
                            dayText(date(), model().state.settings.locale)
                        }}</h2>
                        <ul [class]="styles.popoverList">
                            @for (item of items(); track item.occurrenceId) {
                                <li [class]="styles.popoverItem">
                                    <span [class]="styles.popoverTime">{{
                                        item.allDay ? "All day" : timesOf(model(), item.occurrenceId)
                                    }}</span>
                                    <span [class]="styles.popoverEventTitle">{{
                                        titleOf(model(), item.occurrenceId, item.eventId)
                                    }}</span>
                                </li>
                            }
                        </ul>
                    </div>
                }
            </kit-popover-content>
        </ng-container>
    `,
})
export class MorePopover {
    readonly date = input.required<string>();
    readonly open = input(false);
    readonly closed = output();
    protected readonly styles = styles;
    protected readonly dayText = dayText;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = injectCalendar<Types>().model;

    /** The day's events, read as the open popover renders. */
    protected items() {
        return (
            this.model()
                .get("list")
                .days.find((one) => one.date === this.date())?.items ?? []
        );
    }

    protected onOpenChange({ open, reason }: PopoverOpenChange) {
        if (!open && reason !== "trigger-press") this.closed.emit();
    }
}
