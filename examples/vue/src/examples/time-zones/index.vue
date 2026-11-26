<script setup lang="ts">
import {
    type CalendarEventJson,
    createCalendarModel,
    typedCalendar,
} from "@fragiola/calendar-vue";
import { type ComponentPublicInstance, onMounted, useTemplateRef } from "vue";
import { CALENDARS, day, type Types, teamWeek, weekday } from "../_kit/data";
import AllDayEvent from "./all-day-event.vue";
import DayHeader from "./day-header.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";
import Toolbar from "./toolbar.vue";

/** Events written in other zones: their instants, and a home zone of their own. */
const ZONED: CalendarEventJson<Types>[] = [
    {
        id: "tokyo-standup",
        kind: "meeting",
        title: "Tokyo standup",
        start: `${weekday(3)}T09:00:00+09:00`,
        end: `${weekday(3)}T09:30:00+09:00`,
        allDay: false,
        timeZone: "Asia/Tokyo",
        calendarId: "katherine",
    },
    {
        id: "london-board",
        kind: "meeting",
        title: "London board call",
        start: `${weekday(2)}T15:00:00Z`,
        end: `${weekday(2)}T16:00:00Z`,
        allDay: false,
        timeZone: "Europe/London",
        calendarId: "company",
    },
];

/** The weekend daylight saving time ends in New York: summer offset (-04:00), then -05:00. */
const DST_WEEKEND: CalendarEventJson<Types>[] = [
    {
        id: "breakfast-edt",
        kind: "meeting",
        title: "Breakfast (EDT)",
        start: "2026-10-31T09:00:00-04:00",
        end: "2026-10-31T10:00:00-04:00",
        allDay: false,
        calendarId: "grace",
    },
    {
        id: "night-shift",
        kind: "focus",
        title: "Night shift",
        start: "2026-11-01T00:30:00-04:00",
        end: "2026-11-01T03:30:00-05:00",
        allDay: false,
        calendarId: "alan",
    },
    {
        id: "breakfast-est",
        kind: "meeting",
        title: "Breakfast (EST)",
        start: "2026-11-02T09:00:00-05:00",
        end: "2026-11-02T10:00:00-05:00",
        allDay: false,
        calendarId: "grace",
    },
];

// Time zones: the display zone is a setting (`settings.set { timeZone }`), so switching it moves
// every event to its wall clock there; the instants stay. An event may have a home zone of its own
// (`timeZone`, the Tokyo standup), and its times are RFC 3339 instants whatever the zone. "DST
// weekend" shows the four days around the end of daylight saving time in New York (Sunday
// 2026-11-01, 02:00 → 01:00): 09:00 stays on the 09:00 slot on both sides, and an event across the
// change lasts its real four hours.
// the namespace typed by the registry: the root takes this model (a template passes no type argument)
const Calendar = typedCalendar<Types>();
const model = createCalendarModel<Types>({
    version: 1,
    events: [...teamWeek(), ...ZONED, ...DST_WEEKEND],
    calendars: CALENDARS,
    settings: { timeZone: "America/New_York" },
    view: { type: "week", anchorDate: day() },
});

// a template ref on a part is its component: `$el` is its element
const scroller = useTemplateRef<ComponentPublicInstance>("scroller");
onMounted(() => scrollToMorning(scroller.value?.$el ?? null));

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <Calendar.TimeGrid aria-label="Week" :class="styles.grid">
            <Calendar.ColumnHeaders v-slot="{ date }" :class="styles.headers">
                <DayHeader :date="date" />
            </Calendar.ColumnHeaders>
            <Calendar.AllDayRow :class="styles.allDayRow">
                <div aria-hidden="true" :class="styles.allDayLabel">all-day</div>
                <Calendar.Days v-slot="{ day }">
                    <Calendar.Day :day="day" :class="styles.allDayCell">
                        <Calendar.DayEvents v-slot="{ segment }">
                            <AllDayEvent :segment="segment" />
                        </Calendar.DayEvents>
                    </Calendar.Day>
                </Calendar.Days>
            </Calendar.AllDayRow>
            <Calendar.Scroller ref="scroller" :class="styles.scroller">
                <div :class="styles.body">
                    <Calendar.SlotRows v-slot="{ slot }">
                        <Calendar.SlotRow :slot="slot" :class="styles.slotRow">
                            <Calendar.SlotLabel :class="styles.slotLabel">
                                <SlotTime
                                    v-if="slot.time.endsWith(':00')"
                                    :time="slot.time"
                                />
                            </Calendar.SlotLabel>
                            <Calendar.Slots v-slot="{ column }">
                                <Calendar.Slot
                                    :date="column.date"
                                    :class="styles.slot"
                                />
                            </Calendar.Slots>
                        </Calendar.SlotRow>
                    </Calendar.SlotRows>
                    <Calendar.Columns v-slot="{ column }" :class="styles.columns">
                        <Calendar.Column :column="column" :class="styles.column">
                            <Calendar.ColumnEvents v-slot="{ segment }">
                                <TimedEvent :segment="segment" />
                            </Calendar.ColumnEvents>
                        </Calendar.Column>
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    </Calendar.Root>
</template>
