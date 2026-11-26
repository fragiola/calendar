<script setup lang="ts">
import { Calendar, useDayHeader } from "@fragiola/calendar-vue";
import { text } from "../_kit/format";
import * as styles from "./styles";

// The header shows the weekday and the day (`Intl` parts, the locale's order).
const props = defineProps<{ date: string }>();
const parts = useDayHeader(() => props.date);
</script>

<template>
    <Calendar.ColumnHeader :date="date" :class="styles.header">{{
        text(parts)
    }}</Calendar.ColumnHeader>
</template>
