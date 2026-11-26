<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import { CalendarX } from "@lucide/vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { dayText } from "../_kit/format";
import Item from "./item.vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";

// An agenda: the list view shows the month's days that have events, each under a heading you
// write (the day is data), its events as a list. A month without events is `state.empty`: what
// it shows then is yours too.
// the namespace typed by the registry: the root takes this model (a template passes no type argument)
const Calendar = typedCalendar<Types>();
const model = createCalendarModel<Types>({
    version: 1,
    events: teamWeek(),
    calendars: CALENDARS,
    settings: {},
    view: { type: "list", anchorDate: day() },
});
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <Calendar.List v-slot="{ empty }" :class="styles.list">
            <div v-if="empty" :class="styles.empty">
                <CalendarX aria-hidden="true" :class="styles.emptyIcon" />
                <p>Nothing planned this month.</p>
            </div>
            <Calendar.ListDays v-else v-slot="{ day }">
                <section :key="day.date" :class="styles.day">
                    <h3 :id="`list-${day.date}`" :class="styles.dayHeading">{{
                        dayText(day.date, model.state.settings.locale)
                    }}</h3>
                    <!-- the day's list is named by its heading -->
                    <Calendar.ListDay
                        v-slot="{ item }"
                        :day="day"
                        :aria-labelledby="`list-${day.date}`"
                        :class="styles.events"
                    >
                        <Item :item="item" />
                    </Calendar.ListDay>
                </section>
            </Calendar.ListDays>
        </Calendar.List>
    </Calendar.Root>
</template>
