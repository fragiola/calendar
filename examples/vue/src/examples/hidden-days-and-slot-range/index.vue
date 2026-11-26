<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import AllDayEvent from "./all-day-event.vue";
import DayHeader from "./day-header.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";
import Toolbar from "./toolbar.vue";

// A working week: weekends hidden (`hiddenDays`), the grid from 07:00 to 20:00 (`slotMinTime`,
// `slotMaxTime`), in 15-minute slots (`slotDuration`). The layout, the keys and the navigation
// skip what is hidden; the parts are the same as a full week's.
const Calendar = typedCalendar<Types>();
const model = createCalendarModel<Types>({
    version: 1,
    events: teamWeek(),
    calendars: CALENDARS,
    settings: {
        hiddenDays: [0, 6],
        slotMinTime: "07:00",
        slotMaxTime: "20:00",
        slotDuration: 15,
        firstDayOfWeek: 1,
    },
    view: { type: "week", anchorDate: day() },
});
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <Calendar.TimeGrid aria-label="Working week" :class="styles.grid">
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
            <Calendar.Scroller :class="styles.scroller">
                <div :class="styles.body">
                    <Calendar.SlotRows v-slot="{ slot }">
                        <!-- a row's look follows its slot (the hour's line): the render slot hands it -->
                        <Calendar.SlotRow :slot="slot">
                            <template #render="{ props, state }">
                                <div v-bind="props" :class="styles.slotRow(state)">
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
                                </div>
                            </template>
                        </Calendar.SlotRow>
                    </Calendar.SlotRows>
                    <Calendar.Columns v-slot="{ column }" :class="styles.columns">
                        <Calendar.Column :column="column" :class="styles.column">
                            <Calendar.ColumnEvents v-slot="{ segment }">
                                <TimedEvent :segment="segment" />
                            </Calendar.ColumnEvents>
                        </Calendar.Column>
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    </Calendar.Root>
</template>
