<script setup lang="ts">
import { useCalendarView } from "@fragiola/calendar-vue";
import MonthGrid from "./month-grid.vue";
import WeekGrid from "./week-grid.vue";

const view = useCalendarView();
</script>

<template>
    <MonthGrid v-if="view.type === 'month'" />
    <WeekGrid v-else />
</template>
