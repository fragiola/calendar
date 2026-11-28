<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import { dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { recurrence } from "@fragiola/calendar-vue/recurrence";
import { resize } from "@fragiola/calendar-vue/resize";
import {
    at,
    CALENDARS,
    day,
    type Types,
    teamWeek,
    weekday,
} from "../_kit/data";
import ScopeDialog from "./scope-dialog.vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";
import WeekGrid from "./week-grid.vue";

const FEATURES = [recurrence(), dragAndDrop(), resize()] as const;

// Recurring events: a weekday standup and a monthly review, RFC 5545 rules expanded over what the
// view shows. A drop or a resize of one occurrence asks which ones it changes (the package never
// asks: here a middleware holds the command, a dialog asks, and the command runs again with the
// scope chosen: `this` overrides the occurrence, `following` splits the series, `all` changes it).
// the namespace typed by the registry and the features: the root takes this model
const Calendar = typedCalendar<Types, typeof FEATURES>();
const model = createCalendarModel<Types, typeof FEATURES>(
    {
        version: 1,
        events: [
            ...teamWeek(),
            {
                id: "standup",
                kind: "meeting",
                title: "Standup",
                start: at(weekday(1, -1), "09:00"),
                end: at(weekday(1, -1), "09:30"),
                allDay: false,
                calendarId: "ada",
                recurrence: {
                    rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
                },
            },
            {
                id: "review",
                kind: "meeting",
                title: "Monthly review",
                start: at(weekday(5), "13:00"),
                end: at(weekday(5), "14:00"),
                allDay: false,
                calendarId: "company",
                recurrence: { rule: "FREQ=MONTHLY;COUNT=12" },
            },
        ],
        calendars: CALENDARS,
        view: { type: "week", anchorDate: day() },
    },
    { features: FEATURES },
);
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <WeekGrid />
        <ScopeDialog />
    </Calendar.Root>
</template>
