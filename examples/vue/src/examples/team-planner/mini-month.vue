<script setup lang="ts">
import { useCalendar, useCalendarView } from "@fragiola/calendar-vue";
import { Calendar as DatePicker } from "#/components/ui/calendar";
import type { Types } from "../_kit/data";

/** A `YYYY-MM-DD` day as the date picker's plain date. */
function plainDate(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 };
}

// A mini month to jump around: Fragiola UI's date picker (also named `Calendar`, so imported as
// `DatePicker`). Its plain dates are the calendar's (`{ year, month, day }`): a picked day goes
// straight to `view.go-to`.
const { model } = useCalendar<Types>();
const view = useCalendarView();

function goTo(date: { year: number; month: number; day: number } | null) {
    if (date) model.run("view.go-to", { date });
}
</script>

<template>
    <DatePicker.Template.Simple
        aria-label="Go to a date"
        :value="plainDate(view.anchorDate)"
        @value-change="goTo"
    />
</template>
