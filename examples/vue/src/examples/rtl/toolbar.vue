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
        <Calendar.Today :class="styles.button">اليوم</Calendar.Today>
        <Calendar.Previous aria-label="الأسبوع السابق" :class="styles.iconButton">
            <ChevronLeft aria-hidden="true" :class="styles.flip" />
        </Calendar.Previous>
        <Calendar.Next aria-label="الأسبوع التالي" :class="styles.iconButton">
            <ChevronRight aria-hidden="true" :class="styles.flip" />
        </Calendar.Next>
    </div>
</template>
