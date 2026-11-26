<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import { constraints } from "@fragiola/calendar-vue/constraints";
import { dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";
import WeekGrid from "./week-grid.vue";

const FEATURES = [constraints(), dragAndDrop()] as const;

// Business hours and constraints, as settings the commands enforce:
// - business hours: weekdays 09:00 to 17:00 (`businessHours`), shaded in the grid;
// - every event stays within them (`eventConstraint: "business-hours"`), all-day ones on days
//   that have some;
// - nothing may overlap the company's events (`overlap: { company: false }`).
// A drag asks the model at each target: a refused one shows no preview, and its drop runs
// nothing. The same rules refuse `event.add` and `event.move` from code.
const Calendar = typedCalendar<Types, typeof FEATURES>();
const model = createCalendarModel<Types, typeof FEATURES>(
    {
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        settings: {
            businessHours: [
                {
                    daysOfWeek: [1, 2, 3, 4, 5],
                    startTime: "09:00",
                    endTime: "17:00",
                },
            ],
            eventConstraint: "business-hours",
            overlap: { company: false },
        },
        view: { type: "week", anchorDate: day() },
    },
    { features: FEATURES },
);
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <ul aria-label="Rules" :class="styles.rules">
            <li>Events stay within business hours, Monday to Friday, 9 to 5.</li>
            <li>Nothing overlaps a company event.</li>
        </ul>
        <WeekGrid />
    </Calendar.Root>
</template>
