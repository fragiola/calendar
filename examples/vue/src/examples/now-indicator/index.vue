<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import {
    NowIndicator,
    nowIndicator,
} from "@fragiola/calendar-vue/now-indicator";
import { onMounted, useTemplateRef } from "vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import AllDayEvent from "./all-day-event.vue";
import DayHeader from "./day-header.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";
import Toolbar from "./toolbar.vue";

// The current time in today's column: `nowIndicator()` gives its place from the model's clock, and
// the engine moves it every minute (its own timer, through the root's window). The line, its dot
// and the shade over what is past are yours; past days carry `data-past`.
const FEATURES = [nowIndicator()] as const;
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

/** Opens the time grid two hours before now (app code: the scroll position is yours). */
function scrollToNow(element: HTMLElement | null | undefined) {
    if (!element) return;
    const now = new Date();
    const hour = String(Math.max(now.getHours() - 2, 0)).padStart(2, "0");
    const row = element.querySelector<HTMLElement>(`[data-time="${hour}:00"]`);
    if (row) element.scrollTop = row.offsetTop;
}

const scroller = useTemplateRef<{ $el: HTMLElement }>("scroller");
onMounted(() => scrollToNow(scroller.value?.$el));
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
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
                            <!-- rendered only in today's column, once the engine runs -->
                            <NowIndicator data-testid="now" :class="styles.now">
                                <span :class="styles.nowShade" />
                                <span :class="styles.nowLine" />
                                <span :class="styles.nowDot" />
                            </NowIndicator>
                        </Calendar.Column>
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    </Calendar.Root>
</template>
