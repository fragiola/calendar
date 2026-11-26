<script setup lang="ts">
import { Calendar } from "@fragiola/calendar-vue";
import { DragPreview } from "@fragiola/calendar-vue/drag-and-drop";
import AllDayEvent from "./all-day-event.vue";
import * as styles from "./styles";
import Weekday from "./weekday.vue";
</script>

<template>
    <Calendar.DayGrid aria-label="Month" :class="styles.grid">
        <Calendar.ColumnHeaders v-slot="{ date }" :class="styles.monthHeaders">
            <Weekday :date="date" />
        </Calendar.ColumnHeaders>
        <Calendar.Weeks v-slot="{ week }">
            <Calendar.Week :week="week" :class="styles.monthWeek">
                <Calendar.Days v-slot="{ day }">
                    <Calendar.Day :day="day" :class="styles.monthDay">
                        <span :class="styles.dayNumber">{{
                            Number(day.date.slice(8))
                        }}</span>
                        <Calendar.DayEvents
                            v-slot="{ segment }"
                            :class="styles.dayEvents"
                        >
                            <AllDayEvent :segment="segment" />
                        </Calendar.DayEvents>
                    </Calendar.Day>
                </Calendar.Days>
                <DragPreview :class="styles.rowPreview" />
            </Calendar.Week>
        </Calendar.Weeks>
    </Calendar.DayGrid>
</template>
