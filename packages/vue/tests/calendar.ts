// The tests' calendar, as packages/react's: a model on a fixed clock (2026-11-26 12:00 UTC, a
// Thursday) in UTC with Sunday first, and templates that render every primitive of the view they
// show, as an app's single-file components would (compiled at runtime: the full build of Vue).
import { type Component, defineComponent } from "vue";
import {
    Calendar,
    type CalendarEventJson,
    type CalendarFeatures,
    type CalendarSettingsJson,
    createCalendarModel,
    type ViewJson,
} from "../src";
import { DragPreview } from "../src/drag-and-drop";
import { ResizeHandle } from "../src/resize";
import { Selection } from "../src/selection";

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

/** The primitives as a template names them (`<Calendar.Day>`), the features' parts too. */
export const COMPONENTS: Record<string, Component> = {
    ...Object.fromEntries(
        Object.entries(Calendar).map(([name, part]) => [
            `Calendar.${name}`,
            part as Component,
        ]),
    ),
    DragPreview: DragPreview as Component,
    ResizeHandle: ResizeHandle as Component,
    Selection: Selection as Component,
};

/** A component of a template over the primitives. */
export function view(
    template: string,
    props: Record<string, unknown> = {},
): Component {
    return defineComponent({
        components: COMPONENTS,
        props: Object.keys(props),
        template,
    });
}

/** A month: weekday headers, weeks with week numbers, days, their events and "+N more". */
export const MonthGrid = view(
    `<Calendar.DayGrid>
        <Calendar.ColumnHeaders v-slot="{ date }">
            <Calendar.ColumnHeader :date="date" />
        </Calendar.ColumnHeaders>
        <Calendar.Weeks v-slot="{ week }">
            <Calendar.Week :week="week">
                <Calendar.WeekNumber />
                <Calendar.Days v-slot="{ day }">
                    <Calendar.Day :day="day">
                        <Calendar.DayEvents v-slot="{ segment }">
                            <Calendar.Segment :segment="segment">
                                <ResizeHandle v-if="features" edge="end" />
                            </Calendar.Segment>
                        </Calendar.DayEvents>
                        <Calendar.More />
                    </Calendar.Day>
                </Calendar.Days>
                <template v-if="features">
                    <Selection />
                    <DragPreview />
                </template>
            </Calendar.Week>
        </Calendar.Weeks>
    </Calendar.DayGrid>`,
    { features: false },
);

/** A time grid: headers, the all-day row, slot rows with labels, and the columns' layer. */
export const TimeGridView = view(
    `<Calendar.TimeGrid>
        <Calendar.ColumnHeaders v-slot="{ date }">
            <Calendar.ColumnHeader :date="date" />
        </Calendar.ColumnHeaders>
        <Calendar.AllDayRow>
            <template #day="{ day }">
                <Calendar.Day :day="day">
                    <Calendar.DayEvents v-slot="{ segment }">
                        <Calendar.Segment :segment="segment" />
                    </Calendar.DayEvents>
                </Calendar.Day>
            </template>
        </Calendar.AllDayRow>
        <Calendar.Scroller>
            <Calendar.SlotRows v-slot="{ slot }">
                <Calendar.SlotRow :slot="slot">
                    <Calendar.SlotLabel />
                    <Calendar.Slots v-slot="{ column }">
                        <Calendar.Slot :date="column.date" />
                    </Calendar.Slots>
                </Calendar.SlotRow>
            </Calendar.SlotRows>
            <Calendar.Columns v-slot="{ column }">
                <Calendar.Column :column="column">
                    <Calendar.ColumnEvents v-slot="{ segment }">
                        <Calendar.TimeEvent :segment="segment">
                            <ResizeHandle v-if="features" edge="end" />
                        </Calendar.TimeEvent>
                    </Calendar.ColumnEvents>
                    <template v-if="features">
                        <Selection />
                        <DragPreview />
                    </template>
                    <slot name="column" :column="column" />
                </Calendar.Column>
            </Calendar.Columns>
        </Calendar.Scroller>
    </Calendar.TimeGrid>`,
    { features: false },
);

/** A list view: a heading of the app's per day, then its events. */
export const ListView = view(
    `<Calendar.List>
        <Calendar.ListDays v-slot="{ day }">
            <Calendar.ListDay :day="day" v-slot="{ item }">
                <Calendar.ListEvent :item="item" />
            </Calendar.ListDay>
        </Calendar.ListDays>
    </Calendar.List>`,
);

/** The navigation buttons. */
export const Toolbar = view(
    `<Calendar.Previous />
    <Calendar.Today />
    <Calendar.Next />
    <Calendar.ViewButton view="month" />
    <Calendar.ViewButton view="week" />`,
);
