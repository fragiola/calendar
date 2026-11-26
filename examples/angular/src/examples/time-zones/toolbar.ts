import { Component, signal } from "@angular/core";
import {
    CALENDAR,
    injectCalendar,
    injectCalendarTitle,
} from "@fragiola/calendar-angular";
import { LucideChevronLeft, LucideChevronRight } from "@lucide/angular";
import { SEGMENTED_CONTROL } from "#/components/ui/segmented-control";
import type { Types } from "../_kit/data";
import { text } from "../_kit/format";
import * as styles from "./styles";

/** The display zones the switcher offers. */
const ZONES = [
    { zone: "America/New_York", label: "New York" },
    { zone: "Europe/London", label: "London" },
    { zone: "Asia/Tokyo", label: "Tokyo" },
] as const;

// The title, the display zone (one `settings.set`) and the navigation, inside the root.
@Component({
    selector: "[timeZonesToolbar]",
    imports: [
        CALENDAR,
        LucideChevronLeft,
        LucideChevronRight,
        SEGMENTED_CONTROL,
    ],
    template: `
        <h2 [class]="styles.title">{{ text(title()) }}</h2>
        <div
            kitSegmentedControl
            aria-label="Display time zone"
            [value]="zone()"
            [class]="styles.zones"
            (valueChange)="showZone($event)"
        >
            @for (option of ZONES; track option.zone) {
                <button kitSegmentedControlItem [value]="option.zone">{{ option.label }}</button>
            }
        </div>
        <button type="button" [class]="styles.button" (click)="dstWeekend()">DST weekend</button>
        <button calendarViewButton="week" [class]="styles.button">Week</button>
        <button calendarToday [class]="styles.button">Today</button>
        <button calendarPrevious aria-label="Previous week" [class]="styles.iconButton">
            <svg lucideChevronLeft aria-hidden="true" [class]="styles.flip"></svg>
        </button>
        <button calendarNext aria-label="Next week" [class]="styles.iconButton">
            <svg lucideChevronRight aria-hidden="true" [class]="styles.flip"></svg>
        </button>
    `,
})
export class Toolbar {
    protected readonly styles = styles;
    protected readonly ZONES = ZONES;
    protected readonly text = text;
    protected readonly title = injectCalendarTitle();
    private readonly model = injectCalendar<Types>().model;
    protected readonly zone = signal<string | null>(
        this.model().state.settings.timeZone,
    );

    protected showZone(next: string | null) {
        if (!next) return;
        this.zone.set(next);
        this.model().run("settings.set", { settings: { timeZone: next } });
    }

    protected dstWeekend() {
        this.showZone("America/New_York");
        this.model().run("view.set", { type: "days", days: 4 });
        this.model().run("view.go-to", { date: "2026-10-31" });
    }
}
