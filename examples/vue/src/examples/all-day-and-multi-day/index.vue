<script setup lang="ts">
import {
    type CalendarEventJson,
    createCalendarModel,
    typedCalendar,
} from "@fragiola/calendar-vue";
import { allDay, at, CALENDARS, day, type Types, weekday } from "../_kit/data";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";
import View from "./view.vue";

// Events that are longer than a day. All-day ends are exclusive (a one-day event ends the next
// day); a timed event crossing midnight shows on both days. A segment is an event's part in one
// row: `continuesBefore` and `continuesAfter` say when it goes on in another row, and the
// segments draw it (square ends, an arrow).
const EVENTS: CalendarEventJson<Types>[] = [
    allDay("holiday", "Public holiday", weekday(4), 1, "company"),
    allDay("sprint", "Design sprint", weekday(3), 5, "grace"),
    allDay(
        "vacation",
        "Katherine on vacation",
        weekday(4, -1),
        10,
        "katherine",
    ),
    allDay("conference", "Conference in Lisbon", weekday(1, 1), 3, "alan"),
    {
        id: "release",
        kind: "meeting",
        title: "Release night",
        start: at(weekday(2), "22:00"),
        end: at(weekday(3), "02:00"),
        allDay: false,
        calendarId: "ada",
    },
    {
        id: "flight",
        kind: "trip",
        title: "Flight to Lisbon",
        start: at(weekday(0, 1), "20:00"),
        end: at(weekday(1, 1), "06:30"),
        allDay: false,
        calendarId: "alan",
    },
];

// the namespace typed by the registry: the root takes this model (a template passes no type argument)
const Calendar = typedCalendar<Types>();
const model = createCalendarModel<Types>({
    version: 1,
    events: EVENTS,
    calendars: CALENDARS,
    settings: {},
    view: { type: "month", anchorDate: day() },
});
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <View />
    </Calendar.Root>
</template>
