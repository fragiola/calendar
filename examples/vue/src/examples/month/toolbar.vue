<script setup lang="ts">
import { Calendar, useCalendarTitle } from "@fragiola/calendar-vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import { text } from "../_kit/format";
import * as styles from "./styles";

// The title and the buttons: the title is data (`Intl` parts), the buttons run `view.previous`,
// `view.today` and `view.next`, disabled when the model cannot run them.
const title = useCalendarTitle();
</script>

<template>
    <div :class="styles.toolbar">
        <h2 :class="styles.title">{{ text(title) }}</h2>
        <Calendar.Today :class="styles.button">Today</Calendar.Today>
        <Calendar.Previous aria-label="Previous month" :class="styles.iconButton">
            <ChevronLeft aria-hidden="true" :class="styles.flip" />
        </Calendar.Previous>
        <Calendar.Next aria-label="Next month" :class="styles.iconButton">
            <ChevronRight aria-hidden="true" :class="styles.flip" />
        </Calendar.Next>
        <Calendar.ViewButton view="month" :class="styles.button"
            >Month</Calendar.ViewButton
        >
    </div>
</template>
