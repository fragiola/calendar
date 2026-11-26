<script setup lang="ts">
import { Calendar } from "@fragiola/calendar-vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import * as styles from "./styles";
</script>

<template>
    <Calendar.Today :class="styles.button">Today</Calendar.Today>
    <Calendar.Previous aria-label="Previous week" :class="styles.iconButton">
        <ChevronLeft aria-hidden="true" :class="styles.flip" />
    </Calendar.Previous>
    <Calendar.Next aria-label="Next week" :class="styles.iconButton">
        <ChevronRight aria-hidden="true" :class="styles.flip" />
    </Calendar.Next>
</template>
