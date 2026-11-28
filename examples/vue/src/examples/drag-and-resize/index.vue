<script setup lang="ts">
import {
    type CalendarEngineEventOf,
    createCalendarModel,
    typedCalendar,
} from "@fragiola/calendar-vue";
import { dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { resize } from "@fragiola/calendar-vue/resize";
import { useTemplateRef } from "vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { timesOf, titleOf } from "../_kit/format";
import DropStatus from "./drop-status.vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";
import View from "./view.vue";

const FEATURES = [dragAndDrop(), resize()] as const;

// Drag and resize: move an event to another day or time, between the all-day row and the time
// grid, or from a week to another in the month; pull either edge to resize it. While it moves,
// `DragPreview` shows where it would land (the model is asked first: a refused target shows
// none), and the drop runs one command, which `@event-drop` reports.
const Calendar = typedCalendar<Types, typeof FEATURES>();
const model = createCalendarModel<Types, typeof FEATURES>(
    {
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        view: { type: "week", anchorDate: day() },
    },
    { features: FEATURES },
);
// the status line keeps its own text: a drop re-renders the line, not the calendar
const status = useTemplateRef("status");

function dropped(event: CalendarEngineEventOf<"drop">) {
    const title = titleOf(model, event.occurrenceId, event.eventId);
    status.value?.show(
        `${event.kind === "move" ? "Moved" : "Resized"} “${title}”: ${
            event.allDay ? "all day" : timesOf(model, event.occurrenceId)
        }`,
    );
}
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root" @event-drop="dropped">
        <Toolbar />
        <DropStatus ref="status" />
        <View />
    </Calendar.Root>
</template>
