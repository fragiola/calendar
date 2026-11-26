<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import EventSegment from "./event-segment.vue";
import Settings from "./settings.vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";
import Weekday from "./weekday.vue";

// One month in several locales: `settings.set { locale }` changes the first day of the week (the
// locale's, unless `firstDayOfWeek` says otherwise), the weekday names and the title (`Intl` parts)
// and the week numbers (`weekNumbers: "locale"`, or ISO 8601's weeks). The words are the locale's;
// the grid's names (its label, the buttons') are the app's.
// the namespace typed by the registry: the root takes this model (a template passes no type argument)
const Calendar = typedCalendar<Types>();
const model = createCalendarModel<Types>({
    version: 1,
    events: teamWeek(),
    calendars: CALENDARS,
    settings: {
        locale: "en-US",
        weekNumbers: "locale",
        dayMaxEvents: "auto",
    },
    view: { type: "month", anchorDate: day() },
});
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <Settings />
        <Calendar.DayGrid aria-label="Month" :class="styles.grid">
            <Calendar.ColumnHeaders v-slot="{ date }" :class="styles.headers">
                <Weekday :date="date" />
            </Calendar.ColumnHeaders>
            <Calendar.Weeks v-slot="{ week }">
                <Calendar.Week :week="week" :class="styles.week">
                    <Calendar.WeekNumber
                        v-slot="{ weekNumber }"
                        :class="styles.weekNumber"
                        >{{ weekNumber }}</Calendar.WeekNumber
                    >
                    <Calendar.Days v-slot="{ day }">
                        <Calendar.Day :day="day" :class="styles.day">
                            <div :class="styles.dayHeader">
                                <span :class="styles.dayNumber">{{
                                    Number(day.date.slice(8))
                                }}</span>
                                <Calendar.More
                                    v-slot="{ hiddenCount }"
                                    :class="styles.more"
                                    >+{{ hiddenCount }}</Calendar.More
                                >
                            </div>
                            <Calendar.DayEvents
                                v-slot="{ segment }"
                                :class="styles.dayEvents"
                            >
                                <EventSegment :segment="segment" />
                            </Calendar.DayEvents>
                        </Calendar.Day>
                    </Calendar.Days>
                </Calendar.Week>
            </Calendar.Weeks>
        </Calendar.DayGrid>
    </Calendar.Root>
</template>
