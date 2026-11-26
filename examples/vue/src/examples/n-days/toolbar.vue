<script setup lang="ts">
import { Calendar, useCalendarTitle } from "@fragiola/calendar-vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import { text } from "../_kit/format";
import * as styles from "./styles";

// How many days the view shows: each button runs `view.set { type: "days", days }`.
const LENGTHS = [3, 4, 5] as const;

const title = useCalendarTitle();
</script>

<template>
    <div :class="styles.toolbar">
        <h2 :class="styles.title">{{ text(title) }}</h2>
        <Calendar.Today :class="styles.button">Today</Calendar.Today>
        <Calendar.Previous aria-label="Previous days" :class="styles.iconButton">
            <ChevronLeft aria-hidden="true" :class="styles.flip" />
        </Calendar.Previous>
        <Calendar.Next aria-label="Next days" :class="styles.iconButton">
            <ChevronRight aria-hidden="true" :class="styles.flip" />
        </Calendar.Next>
        <fieldset aria-label="Days shown" :class="styles.lengths">
            <Calendar.ViewButton
                v-for="days in LENGTHS"
                :key="days"
                view="days"
                :days="days"
                :class="styles.length"
                >{{ `${days} days` }}</Calendar.ViewButton
            >
        </fieldset>
    </div>
</template>
