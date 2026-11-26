<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import {
    NowIndicator,
    nowIndicator,
} from "@fragiola/calendar-vue/now-indicator";
import { type ComponentPublicInstance, onMounted, useTemplateRef } from "vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import AllDayEvent from "./all-day-event.vue";
import DayHeader from "./day-header.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";
import Toolbar from "./toolbar.vue";

// The features this calendar installs: the current time's line in today's column.
const FEATURES = [nowIndicator()] as const;

// One day: the week's parts with one column. Previous and Next step a day; the line of the
// current time sits in today's column, moved by the engine's clock (`nowIndicator()`).
// the namespace typed by the registry: the root takes this model (a template passes no type argument)
const Calendar = typedCalendar<Types, typeof FEATURES>();
const model = createCalendarModel<Types, typeof FEATURES>(
    {
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        settings: {},
        view: { type: "day", anchorDate: day() },
    },
    { features: FEATURES },
);

// a template ref on a part is its component: `$el` is its element
const scroller = useTemplateRef<ComponentPublicInstance>("scroller");
onMounted(() => scrollToMorning(scroller.value?.$el ?? null));

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <Calendar.TimeGrid aria-label="Day" :class="styles.grid">
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
                            <!-- rendered only in today's column -->
                            <NowIndicator data-testid="now" :class="styles.now" />
                        </Calendar.Column>
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    </Calendar.Root>
</template>
