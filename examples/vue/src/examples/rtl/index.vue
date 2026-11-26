<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import { DragPreview, dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { onMounted, ref } from "vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import AllDayEvent from "./all-day-event.vue";
import DayHeader from "./day-header.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";
import Toolbar from "./toolbar.vue";

// A week in Arabic, right to left: `dir="rtl"` on the root is all it takes. The columns run from
// the right (the engine reads the direction from the root's style), the arrow keys follow the
// reading order, a drag follows the pointer, and every class is a logical property (`ps`, `start`,
// `border-s`), so the same styles serve both directions. The dates are `Intl` parts in `ar`.
const FEATURES = [dragAndDrop()] as const;
const Calendar = typedCalendar<Types, typeof FEATURES>();
const model = createCalendarModel<Types, typeof FEATURES>(
    {
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        settings: { locale: "ar", firstDayOfWeek: 6 },
        view: { type: "week", anchorDate: day() },
    },
    { features: FEATURES },
);

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
const scroller = ref<{ $el: HTMLElement } | null>(null);
onMounted(() => {
    const element = scroller.value?.$el;
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
});
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root" dir="rtl" lang="ar">
        <Toolbar />
        <Calendar.TimeGrid aria-label="الأسبوع" :class="styles.grid">
            <Calendar.ColumnHeaders v-slot="{ date }" :class="styles.headers">
                <DayHeader :date="date" />
            </Calendar.ColumnHeaders>
            <Calendar.AllDayRow :class="styles.allDayRow">
                <div aria-hidden="true" :class="styles.allDayLabel">طوال اليوم</div>
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
                            <DragPreview :class="styles.preview" />
                        </Calendar.Column>
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    </Calendar.Root>
</template>
