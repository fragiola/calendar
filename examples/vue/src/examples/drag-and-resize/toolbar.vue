<script setup lang="ts">
import { Calendar, useCalendarTitle } from "@fragiola/calendar-vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import { text } from "../_kit/format";
import * as styles from "./styles";

const title = useCalendarTitle();
</script>

<template>
    <div :class="styles.toolbar">
        <h2 :class="styles.title">{{ text(title) }}</h2>
        <Calendar.ViewButton view="week" :class="styles.button">Week</Calendar.ViewButton>
        <Calendar.ViewButton view="month" :class="styles.button">Month</Calendar.ViewButton>
        <Calendar.Today :class="styles.button">Today</Calendar.Today>
        <Calendar.Previous aria-label="Previous" :class="styles.iconButton">
            <ChevronLeft aria-hidden="true" :class="styles.flip" />
        </Calendar.Previous>
        <Calendar.Next aria-label="Next" :class="styles.iconButton">
            <ChevronRight aria-hidden="true" :class="styles.flip" />
        </Calendar.Next>
    </div>
</template>
