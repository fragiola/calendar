<script setup lang="ts">
import { Calendar } from "@fragiola/calendar-vue";
import Bar from "./bar.vue";
import * as styles from "./styles";
import Weekday from "./weekday.vue";
</script>

<template>
    <Calendar.DayGrid aria-label="Month" :class="styles.grid">
        <Calendar.ColumnHeaders v-slot="{ date }" :class="styles.monthHeaders">
            <Weekday :date="date" :format="{ weekday: 'short' }" />
        </Calendar.ColumnHeaders>
        <Calendar.Weeks v-slot="{ week }">
            <Calendar.Week :week="week" :class="styles.week">
                <template #day="{ day }">
                    <Calendar.Day :day="day" :class="styles.day">
                        <span :class="styles.dayNumber">{{
                            Number(day.date.slice(8))
                        }}</span>
                        <Calendar.DayEvents
                            v-slot="{ segment }"
                            :class="styles.dayEvents"
                        >
                            <Bar :segment="segment" />
                        </Calendar.DayEvents>
                    </Calendar.Day>
                </template>
            </Calendar.Week>
        </Calendar.Weeks>
    </Calendar.DayGrid>
</template>
