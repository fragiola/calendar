<script setup lang="ts">
import { Calendar, useCalendarView } from "@fragiola/calendar-vue";
import DayAgenda from "./day-agenda.vue";
import EventSegment from "./event-segment.vue";
import * as styles from "./styles";
import Weekday from "./weekday.vue";

// The month's grid, or the day "+N more" opened, as a list.
const view = useCalendarView();
</script>

<template>
    <DayAgenda v-if="view.type === 'day'" />
    <Calendar.DayGrid v-else aria-label="Month" :class="styles.grid">
        <Calendar.ColumnHeaders v-slot="{ date }" :class="styles.headers">
            <Weekday :date="date" />
        </Calendar.ColumnHeaders>
        <Calendar.Weeks v-slot="{ week }">
            <Calendar.Week :week="week" :class="styles.week">
                <template #day="{ day }">
                    <Calendar.Day :day="day" :class="styles.day">
                        <div :class="styles.dayHeader">
                            <span :class="styles.dayNumber">{{
                                Number(day.date.slice(8))
                            }}</span>
                            <Calendar.More
                                v-slot="{ hiddenCount }"
                                :class="styles.more"
                                >+{{ hiddenCount }} more</Calendar.More
                            >
                        </div>
                        <Calendar.DayEvents
                            v-slot="{ segment }"
                            :class="styles.dayEvents"
                        >
                            <EventSegment :segment="segment" />
                        </Calendar.DayEvents>
                    </Calendar.Day>
                </template>
            </Calendar.Week>
        </Calendar.Weeks>
    </Calendar.DayGrid>
</template>
