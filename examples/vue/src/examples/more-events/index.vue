<script setup lang="ts">
import {
    type CalendarEventJson,
    createCalendarModel,
    typedCalendar,
} from "@fragiola/calendar-vue";
import { ref } from "vue";
import {
    CALENDARS,
    day,
    type Types,
    teamWeek,
    timed,
    weekday,
} from "../_kit/data";
import EventSegment from "./event-segment.vue";
import MorePopover from "./more-popover.vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";
import Weekday from "./weekday.vue";

/** A busy month: the team's week, and a standup and a review every weekday of four weeks. */
function busyMonth(): CalendarEventJson<Types>[] {
    const days = [-2, -1, 0, 1].flatMap((weeks) =>
        [1, 2, 3, 4, 5].map((weekdayNumber) => weekday(weekdayNumber, weeks)),
    );
    return [
        ...teamWeek(),
        ...days.flatMap((date) => [
            timed(`standup-${date}`, "Standup", date, "09:00", "09:15", "ada"),
            timed(
                `review-${date}`,
                "Code review",
                date,
                "16:00",
                "16:30",
                "alan",
            ),
        ]),
    ];
}

// A busy month that shows two events a day (`dayMaxEvents: 2`). "+N more" is Calendar.More,
// the trigger of Fragiola UI's popover (`as-child`), which lists the day's events. A press on it,
// Enter on it (it is the last item of the day's events on the keyboard) or an assistive click is
// the engine's `more-click`: the popover opens from `@more-click`.
// the namespace typed by the registry: the root takes this model (a template passes no type argument)
const Calendar = typedCalendar<Types>();
const model = createCalendarModel<Types>({
    version: 1,
    events: busyMonth(),
    calendars: CALENDARS,
    settings: { dayMaxEvents: 2 },
    view: { type: "month", anchorDate: day() },
});
// the day whose popover is open: app state the days' slot reads (it renders again when it changes)
const open = ref<string | null>(null);
</script>

<template>
    <Calendar.Root
        :model="model"
        :class="styles.root"
        @more-click="(event) => (open = event.date)"
    >
        <Toolbar />
        <Calendar.DayGrid aria-label="Month" :class="styles.grid">
            <Calendar.ColumnHeaders v-slot="{ date }" :class="styles.headers">
                <Weekday :date="date" />
            </Calendar.ColumnHeaders>
            <Calendar.Weeks v-slot="{ week }">
                <Calendar.Week :week="week" :class="styles.week">
                    <template #day="{ day }">
                        <Calendar.Day :day="day" :class="styles.day">
                            <span :class="styles.dayNumber">{{
                                Number(day.date.slice(8))
                            }}</span>
                            <Calendar.DayEvents
                                v-slot="{ segment }"
                                :class="styles.dayEvents"
                            >
                                <EventSegment :segment="segment" />
                            </Calendar.DayEvents>
                            <MorePopover
                                :date="day.date"
                                :open="open === day.date"
                                @open="open = day.date"
                                @close="open = null"
                            />
                        </Calendar.Day>
                    </template>
                </Calendar.Week>
            </Calendar.Weeks>
        </Calendar.DayGrid>
    </Calendar.Root>
</template>
