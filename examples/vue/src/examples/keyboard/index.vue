<script setup lang="ts">
import {
    type Announcement,
    createCalendarModel,
    typedCalendar,
} from "@fragiola/calendar-vue";
import { DragPreview, dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { resize } from "@fragiola/calendar-vue/resize";
import { Selection, selection } from "@fragiola/calendar-vue/selection";
import { onMounted, ref } from "vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import AllDayEvent from "./all-day-event.vue";
import { announcementText } from "./announce";
import DayHeader from "./day-header.vue";
import Keys from "./keys.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";
import Toolbar from "./toolbar.vue";

// The whole calendar from the keyboard. Tab enters the grid once (its one tab stop); the arrows
// move over the slots and the all-day row; Enter goes into a slot's events, Up and Down between
// them, Escape back. On an event, Space grabs it: the arrows move it (a day, or a snap step), Shift
// and the arrows resize it, Enter drops it (one command), Escape cancels. Shift and the arrows on
// a slot select a range. The engine announces each step as data; this app words it in a live
// region of its own (`announce.ts`).
const FEATURES = [selection(), dragAndDrop(), resize()] as const;
const Calendar = typedCalendar<Types, typeof FEATURES>();
const model = createCalendarModel<Types, typeof FEATURES>(
    {
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        settings: {},
        view: { type: "week", anchorDate: day() },
    },
    { features: FEATURES },
);
const message = ref("");

function announce({ announcement }: { announcement: Announcement }) {
    message.value = announcementText(model, announcement);
}

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
const scroller = ref<{ $el: HTMLElement } | null>(null);
onMounted(() => {
    const element = scroller.value?.$el;
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
});
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root" @announce="announce">
        <Toolbar />
        <Keys />
        <div
            role="status"
            aria-live="polite"
            data-testid="announcer"
            :class="styles.status"
        >{{ message }}</div>
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
                <DragPreview :class="styles.preview" />
            </Calendar.AllDayRow>
            <Calendar.Scroller ref="scroller" :class="styles.scroller">
                <div :class="styles.body">
                    <!--
                        The rows' and the columns' slots read only their scope, so Vue compiles
                        them stable: they are called again only for a row or a column whose layout
                        changed, not on every re-render of the app (an announcement, a keystroke
                        in a field). React declares these children functions outside its
                        component for the same effect.
                    -->
                    <Calendar.SlotRows v-slot="{ slot }">
                        <Calendar.SlotRow :slot="slot" :class="styles.slotRow">
                            <Calendar.SlotLabel :class="styles.slotLabel">
                                <SlotTime
                                    v-if="slot.time.endsWith(':00')"
                                    :time="slot.time"
                                />
                            </Calendar.SlotLabel>
                            <Calendar.Slots v-slot="{ column }">
                                <Calendar.Slot
                                    :date="column.date"
                                    :class="styles.slot"
                                />
                            </Calendar.Slots>
                        </Calendar.SlotRow>
                    </Calendar.SlotRows>
                    <Calendar.Columns v-slot="{ column }" :class="styles.columns">
                        <Calendar.Column :column="column" :class="styles.column">
                            <Calendar.ColumnEvents v-slot="{ segment }">
                                <TimedEvent :segment="segment" />
                            </Calendar.ColumnEvents>
                            <Selection :class="styles.selection" />
                            <DragPreview :class="styles.preview" />
                        </Calendar.Column>
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    </Calendar.Root>
</template>
