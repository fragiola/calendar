<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import { dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { resize } from "@fragiola/calendar-vue/resize";
import { Redo2, Undo2 } from "@lucide/vue";
import {
    computed,
    onBeforeUnmount,
    onMounted,
    shallowRef,
    useTemplateRef,
} from "vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { UndoManager } from "../_kit/undo";
import AllDayEvent from "./all-day-event.vue";
import DayHeader from "./day-header.vue";
import Navigation from "./navigation.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";
import Title from "./title.vue";

const features = [dragAndDrop(), resize()] as const;

// Undo and redo are app code (_kit/undo.ts): the manager listens to every commit of the model and
// keeps the events before each change; undo puts a list back with `event.set-all`. A drag or a
// resize is one command, so one step. Ctrl+Z and Ctrl+Shift+Z (or Ctrl+Y) work anywhere in the
// example.
const Calendar = typedCalendar<Types, typeof features>();
const model = createCalendarModel<Types, typeof features>(
    {
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        view: { type: "week", anchorDate: day() },
    },
    { features },
);
const undo = new UndoManager(model);
// the manager's snapshot, kept in step with it
const history = shallowRef(undo.getSnapshot());
const stopHistory = undo.subscribe(() => {
    history.value = undo.getSnapshot();
});

// the shortcuts: on the document, as an editor's are (a field keeps its own)
function onKey(event: KeyboardEvent) {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) undo.undo();
    else if ((key === "z" && event.shiftKey) || key === "y") undo.redo();
    else return;
    event.preventDefault();
}
onMounted(() => document.addEventListener("keydown", onKey));
onBeforeUnmount(() => {
    document.removeEventListener("keydown", onKey);
    stopHistory();
});

const statusText = computed(() => {
    const steps = history.value.undoSteps;
    const last = steps.at(-1)?.command;
    return last
        ? `${steps.length} step${steps.length === 1 ? "" : "s"} to undo, the last one ${last}`
        : "Drag or resize an event, then undo it.";
});

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null | undefined) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}

const scroller = useTemplateRef<{ $el: HTMLElement }>("scroller");
onMounted(() => scrollToMorning(scroller.value?.$el));
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <div :class="styles.toolbar">
            <Title />
            <button
                type="button"
                :class="styles.button"
                :disabled="!history.canUndo"
                @click="undo.undo()"
            >
                <Undo2 aria-hidden="true" :class="styles.icon" />Undo
            </button>
            <button
                type="button"
                :class="styles.button"
                :disabled="!history.canRedo"
                @click="undo.redo()"
            >
                <Redo2 aria-hidden="true" :class="styles.icon" />Redo
            </button>
            <Navigation />
        </div>
        <p role="status" :class="styles.status">{{ statusText }}</p>
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
                                <Calendar.Slot :date="column.date" :class="styles.slot" />
                            </Calendar.Slots>
                        </Calendar.SlotRow>
                    </Calendar.SlotRows>
                    <Calendar.Columns v-slot="{ column }" :class="styles.columns">
                        <Calendar.Column :column="column" :class="styles.column">
                            <Calendar.ColumnEvents v-slot="{ segment }">
                                <TimedEvent :segment="segment" />
                            </Calendar.ColumnEvents>
                            <DragPreview :class="styles.preview" />
                        </Calendar.Column>
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    </Calendar.Root>
</template>
