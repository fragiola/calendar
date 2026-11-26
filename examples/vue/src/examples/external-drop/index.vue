<script setup lang="ts">
import {
    type CalendarEngineEventOf,
    createCalendarModel,
    typedCalendar,
} from "@fragiola/calendar-vue";
import { dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { externalDrop } from "@fragiola/calendar-vue/external-drop";
import { FileText, GripVertical } from "@lucide/vue";
import { ref } from "vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";
import WeekGrid from "./week-grid.vue";

/** The app's own drag type: what a task carries (its id), beside a readable text. */
const TASK_TYPE = "application/x-task";

const TASKS = [
    { id: "report", title: "Write the quarterly report", minutes: 90 },
    { id: "invoices", title: "Review invoices", minutes: 30 },
    { id: "onboarding", title: "Onboarding checklist", minutes: 60 },
];

// What a drop becomes (`draft`): a task's title and duration, or a dropped file's name; the
// target gives the times (a slot: timed, the all-day row: all day). `null` leaves a drop to the
// app (the `external-drop` event carries it).
const FEATURES = [
    dragAndDrop(),
    externalDrop({
        accept: (types) => types.includes(TASK_TYPE) || types.includes("Files"),
        draft: (data) => {
            const task = TASKS.find(
                (one) => one.id === data.getData(TASK_TYPE),
            );
            if (task) {
                return {
                    title: task.title,
                    calendarId: "grace",
                    kind: "focus",
                    duration: { minutes: task.minutes },
                };
            }
            const file = data.files[0];
            return file
                ? {
                      title: `Read ${file.name}`,
                      calendarId: "alan",
                      kind: "focus",
                  }
                : null;
        },
    }),
] as const;

// External drop: drag a task from the list onto the week (a native drag: the browser's own), or
// drop a file from your desktop. Each drop runs `event.add` where it lands; the dropped task
// leaves the list.
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
const tasks = ref(TASKS);
const dragged = ref<string | null>(null);

function dropped(event: CalendarEngineEventOf<"external-drop">) {
    if (event.eventId !== null && dragged.value !== null) {
        const id = dragged.value;
        tasks.value = tasks.value.filter((task) => task.id !== id);
    }
    dragged.value = null;
}

function dragStart(event: DragEvent, task: (typeof TASKS)[number]) {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(TASK_TYPE, task.id);
    event.dataTransfer.setData("text/plain", task.title);
    event.dataTransfer.effectAllowed = "copy";
    dragged.value = task.id;
}
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root" @external-drop="dropped">
        <Toolbar />
        <div :class="styles.layout">
            <aside :class="styles.panel" aria-labelledby="tasks-heading">
                <h3 id="tasks-heading" :class="styles.panelTitle">Tasks</h3>
                <ul aria-label="Tasks" :class="styles.tasks">
                    <li
                        v-for="task in tasks"
                        :key="task.id"
                        draggable="true"
                        :class="styles.task"
                        @dragstart="dragStart($event, task)"
                        @dragend="dragged = null"
                    >
                        <GripVertical aria-hidden="true" :class="styles.grip" />
                        <span>{{ task.title }}</span>
                        <span :class="styles.taskTime">{{ `${task.minutes} min` }}</span>
                    </li>
                </ul>
                <p v-if="tasks.length === 0" :class="styles.empty">Every task is planned.</p>
                <p :class="styles.fileHint">
                    <FileText aria-hidden="true" :class="styles.grip" />Or drop a file from your desktop.
                </p>
            </aside>
            <WeekGrid />
        </div>
    </Calendar.Root>
</template>
