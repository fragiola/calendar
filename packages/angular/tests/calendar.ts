// The tests' calendars: a model on a fixed clock (2026-11-26 12:00 UTC, a Thursday) in UTC with
// Sunday first (packages/react's), and standalone components that render every directive of the
// view the root shows, as an app's template would.
import { Component, input } from "@angular/core";
import {
    CalendarDragAndDropRootDirective,
    CalendarDragPreviewDirective,
} from "../drag-and-drop/public-api";
import { CalendarResizeHandleDirective } from "../resize/public-api";
import {
    CalendarSelectionDirective,
    CalendarSelectionRootDirective,
} from "../selection/public-api";
import {
    CALENDAR,
    type CalendarEngineEvent,
    type CalendarEventJson,
    type CalendarFeatures,
    type CalendarModel,
    type CalendarSettingsJson,
    createCalendarModel,
    type ViewJson,
} from "../src/public-api";

export const NOW = Date.UTC(2026, 10, 26, 12);

/** An all-day event (end exclusive). */
export function allDay(
    id: string,
    start: string,
    end: string,
): CalendarEventJson {
    return { id, title: id, start, end, allDay: true };
}

/** A timed event at `HH:mm` times on a day, in UTC. */
export function timed(
    id: string,
    start: string,
    end: string,
    date = "2026-11-26",
): CalendarEventJson {
    return {
        id,
        title: id,
        start: `${date}T${start}:00Z`,
        end: `${date}T${end}:00Z`,
        allDay: false,
    };
}

export const SETTINGS: CalendarSettingsJson = {
    timeZone: "UTC",
    firstDayOfWeek: 0,
};

/** A model of events on the fixed clock. */
export function modelOf<const F extends CalendarFeatures = readonly []>(
    events: CalendarEventJson[] = [],
    options: {
        view?: ViewJson;
        settings?: CalendarSettingsJson;
        features?: F;
    } = {},
) {
    return createCalendarModel(
        {
            version: 1,
            events,
            settings: { ...SETTINGS, ...options.settings },
            ...(options.view ? { view: options.view } : {}),
        },
        { now: () => NOW, features: options.features },
    );
}

/** The parts of a month, a time grid and a list (the view the root shows), the features' too. */
export const VIEWS = `
    <button calendarPrevious></button>
    <button calendarToday></button>
    <button calendarNext></button>
    <button calendarViewButton="month"></button>
    <button calendarViewButton="week"></button>
    @switch (calendar.state().view) {
        @case ("month") {
            <div calendarDayGrid>
                <div calendarColumnHeaders>
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date"></div>
                    </ng-template>
                </div>
                <ng-template calendarWeeks let-week>
                    <div [calendarWeek]="week">
                        @if (weekNumbers()) {
                            <div calendarWeekNumber></div>
                        }
                        <ng-template calendarDays let-day>
                            <div [calendarDay]="day">
                                <div calendarDayEvents>
                                    <ng-template calendarDayEventsItem let-segment>
                                        <div [calendarSegment]="segment">
                                            @if (features()) {
                                                <div *calendarResizeHandle="'end'"></div>
                                            }
                                        </div>
                                    </ng-template>
                                </div>
                                <button *calendarMore="let more"></button>
                            </div>
                        </ng-template>
                        @if (features()) {
                            <div *calendarSelection></div>
                            <div *calendarDragPreview></div>
                        }
                    </div>
                </ng-template>
            </div>
        }
        @case ("list") {
            <div calendarList>
                <ng-template calendarListDays let-day>
                    <div [calendarListDay]="day">
                        <ng-template calendarListDayItem let-item>
                            <div [calendarListEvent]="item"></div>
                        </ng-template>
                    </div>
                </ng-template>
            </div>
        }
        @default {
            <div calendarTimeGrid>
                <div calendarColumnHeaders>
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date"></div>
                    </ng-template>
                </div>
                <div calendarAllDayRow>
                    <ng-template calendarDays let-day>
                        <div [calendarDay]="day">
                            <div calendarDayEvents>
                                <ng-template calendarDayEventsItem let-segment>
                                    <div [calendarSegment]="segment"></div>
                                </ng-template>
                            </div>
                        </div>
                    </ng-template>
                </div>
                <div calendarScroller>
                    <ng-template calendarSlotRows let-slot>
                        <div [calendarSlotRow]="slot">
                            <div calendarSlotLabel></div>
                            <ng-template calendarSlots let-column>
                                <div [calendarSlot]="column.date"></div>
                            </ng-template>
                        </div>
                    </ng-template>
                    <div calendarColumns>
                        <ng-template calendarColumnsItem let-column>
                            <div [calendarColumn]="column">
                                <div calendarColumnEvents>
                                    <ng-template calendarColumnEventsItem let-segment>
                                        <div [calendarTimeEvent]="segment">
                                            @if (features()) {
                                                <div *calendarResizeHandle="'end'"></div>
                                            }
                                        </div>
                                    </ng-template>
                                </div>
                                @if (features()) {
                                    <div *calendarSelection></div>
                                    <div *calendarDragPreview></div>
                                }
                            </div>
                        </ng-template>
                    </div>
                </div>
            </div>
        }
    }
`;

/** The directives the views use. */
export const IMPORTS = [
    CALENDAR,
    CalendarSelectionDirective,
    CalendarDragPreviewDirective,
    CalendarResizeHandleDirective,
] as const;

/** A calendar of a given model, rendering its view's every part. */
@Component({
    selector: "test-calendar",
    imports: [IMPORTS],
    template: `
        <div
            [calendarRoot]="model()"
            #calendar="calendarRoot"
            [weekNumberColumn]="weekNumbers()"
        >
            ${VIEWS}
        </div>
    `,
})
export class TestCalendar {
    readonly model = input.required<CalendarModel>();
    /** renders the features' parts (with their features in the model) */
    readonly features = input(false);
    /** renders the week numbers, and tells the root */
    readonly weekNumbers = input(false);
}

/**
 * A calendar whose model has the gesture features: every engine event, the features' included
 * (`(rangeSelect)`, `(eventDrop)` from the root's feature directives), goes to `onEvent`.
 */
@Component({
    selector: "test-feature-calendar",
    imports: [
        IMPORTS,
        CalendarSelectionRootDirective,
        CalendarDragAndDropRootDirective,
    ],
    template: `
        <div
            [calendarRoot]="model()"
            #calendar="calendarRoot"
            calendarSelection
            calendarDragAndDrop
            calendarResize
            (eventClick)="onEvent()?.($event)"
            (dateClick)="onEvent()?.($event)"
            (moreClick)="onEvent()?.($event)"
            (announce)="onEvent()?.($event)"
            (rangeSelect)="onEvent()?.($event)"
            (eventDrop)="onEvent()?.($event)"
        >
            ${VIEWS}
        </div>
    `,
})
export class FeatureCalendar {
    readonly model = input.required<CalendarModel>();
    readonly features = input(true);
    readonly weekNumbers = input(false);
    readonly onEvent = input<(event: CalendarEngineEvent) => void>();
}
