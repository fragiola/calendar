<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import MonthOrDay from "./month-or-day.vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";

// A month: the toolbar runs the view commands, the grid is yours to assemble. Days show as many
// events as fit (`dayMaxEvents: "auto"`, measured by the engine); "+N more" opens that day as an
// agenda (the list of any view's days), and "Month" goes back.
// the namespace typed by the registry: the root takes this model (a template passes no type argument)
const Calendar = typedCalendar<Types>();
const model = createCalendarModel<Types>({
    version: 1,
    events: teamWeek(),
    calendars: CALENDARS,
    settings: { dayMaxEvents: "auto" },
    view: { type: "month", anchorDate: day() },
});

function openDay({ date }: { date: string }) {
    model.run("view.set", { type: "day" });
    model.run("view.go-to", { date });
}
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root" @more-click="openDay">
        <Toolbar />
        <MonthOrDay />
    </Calendar.Root>
</template>
