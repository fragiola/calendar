<script setup lang="ts">
import { Calendar } from "@fragiola/calendar-vue";
import Bar from "./bar.vue";
import * as styles from "./styles";
import Timed from "./timed.vue";
import Weekday from "./weekday.vue";
</script>

<template>
    <Calendar.TimeGrid aria-label="Week" :class="styles.grid">
        <Calendar.ColumnHeaders v-slot="{ date }" :class="styles.weekHeaders">
            <Weekday :date="date" />
        </Calendar.ColumnHeaders>
        <Calendar.AllDayRow :class="styles.allDayRow">
            <div aria-hidden="true" :class="styles.allDayLabel">all-day</div>
            <Calendar.Days v-slot="{ day }">
                <Calendar.Day :day="day" :class="styles.allDayCell">
                    <Calendar.DayEvents v-slot="{ segment }">
                        <Bar :segment="segment" />
                    </Calendar.DayEvents>
                </Calendar.Day>
            </Calendar.Days>
        </Calendar.AllDayRow>
        <Calendar.Scroller :class="styles.scroller">
            <div :class="styles.body">
                <Calendar.SlotRows v-slot="{ slot }">
                    <Calendar.SlotRow :slot="slot" :class="styles.slotRow">
                        <Calendar.SlotLabel :class="styles.slotLabel">{{
                            slot.time.endsWith(":00") ? slot.time : null
                        }}</Calendar.SlotLabel>
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
                            <Timed :segment="segment" />
                        </Calendar.ColumnEvents>
                    </Calendar.Column>
                </Calendar.Columns>
            </div>
        </Calendar.Scroller>
    </Calendar.TimeGrid>
</template>
