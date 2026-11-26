<script setup lang="ts">
import {
    type CalendarDocument,
    createCalendarModel,
    typedCalendar,
} from "@fragiola/calendar-vue";
import { dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { resize } from "@fragiola/calendar-vue/resize";
import { RotateCcw, Save } from "@lucide/vue";
import { onMounted, ref, shallowRef, useTemplateRef } from "vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { clearCalendar, restoreCalendar, saveCalendar } from "../_kit/persist";
import AllDayEvent from "./all-day-event.vue";
import DayHeader from "./day-header.vue";
import Navigation from "./navigation.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";
import Title from "./title.vue";

const features = [dragAndDrop(), resize()] as const;

/** Where this example keeps its calendar in local storage. */
const KEY = "fragiola-calendar-example:save-and-restore";

/** The calendar a first visit (or a reset) starts from. */
function initial(): CalendarDocument<Types> {
    return {
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        view: { type: "week", anchorDate: day() },
    };
}

/** The saved calendar, or the initial one. */
function load() {
    return createCalendarModel<Types, typeof features>(
        restoreCalendar<Types>(KEY) ?? initial(),
        { features },
    );
}

// The calendar is JSON: `model.get("calendar-json", { includeView: true })` is everything it holds
// (events, calendars, settings, and here the view), and `createCalendarModel` reads it back. Move
// an event or change the week, save, then reload the page: the calendar comes back as saved.
const Calendar = typedCalendar<Types, typeof features>();
const model = shallowRef(load());
// a reset gives the root a new model: a new key mounts it afresh
const generation = ref(0);
const status = ref(
    restoreCalendar(KEY)
        ? "Restored the saved calendar."
        : "Nothing saved yet.",
);
function save() {
    status.value = saveCalendar(KEY, model.value)
        ? "Saved. Reload the page to restore it."
        : "This browser does not let the page save.";
}
function reset() {
    clearCalendar(KEY);
    model.value = createCalendarModel<Types, typeof features>(initial(), {
        features,
    });
    generation.value += 1;
    status.value = "Back to the initial calendar; nothing saved.";
}

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null | undefined) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}

const scroller = useTemplateRef<{ $el: HTMLElement }>("scroller");
onMounted(() => scrollToMorning(scroller.value?.$el));
</script>

<template>
    <Calendar.Root :key="generation" :model="model" :class="styles.root">
        <div :class="styles.toolbar">
            <Title />
            <button type="button" :class="styles.button" @click="save">
                <Save aria-hidden="true" :class="styles.icon" />Save
            </button>
            <button type="button" :class="styles.button" @click="reset">
                <RotateCcw aria-hidden="true" :class="styles.icon" />Reset
            </button>
            <Navigation />
        </div>
        <p role="status" :class="styles.status">{{ status }}</p>
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
