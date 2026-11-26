<script setup lang="ts">
import {
    Calendar,
    useCalendar,
    useCalendarTitle,
} from "@fragiola/calendar-vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import { ref } from "vue";
import { SegmentedControl } from "#/components/ui/segmented-control";
import type { Types } from "../_kit/data";
import { text } from "../_kit/format";
import * as styles from "./styles";

/** The display zones the switcher offers. */
const ZONES = [
    { zone: "America/New_York", label: "New York" },
    { zone: "Europe/London", label: "London" },
    { zone: "Asia/Tokyo", label: "Tokyo" },
] as const;

const title = useCalendarTitle();
const { model } = useCalendar<Types>();
const zone = ref<string | null>(model.state.settings.timeZone);

function showZone(next: unknown) {
    if (typeof next !== "string" || !next) return;
    zone.value = next;
    model.run("settings.set", { settings: { timeZone: next } });
}

function dstWeekend() {
    showZone("America/New_York");
    model.run("view.set", { type: "days", days: 4 });
    model.run("view.go-to", { date: "2026-10-31" });
}
</script>

<template>
    <div :class="styles.toolbar">
        <h2 :class="styles.title">{{ text(title) }}</h2>
        <SegmentedControl.Root
            aria-label="Display time zone"
            :model-value="zone"
            :class="styles.zones"
            @update:model-value="showZone"
        >
            <SegmentedControl.Item
                v-for="option in ZONES"
                :key="option.zone"
                :value="option.zone"
                >{{ option.label }}</SegmentedControl.Item
            >
        </SegmentedControl.Root>
        <button type="button" :class="styles.button" @click="dstWeekend">DST weekend</button>
        <Calendar.ViewButton view="week" :class="styles.button">Week</Calendar.ViewButton>
        <Calendar.Today :class="styles.button">Today</Calendar.Today>
        <Calendar.Previous aria-label="Previous week" :class="styles.iconButton">
            <ChevronLeft aria-hidden="true" :class="styles.flip" />
        </Calendar.Previous>
        <Calendar.Next aria-label="Next week" :class="styles.iconButton">
            <ChevronRight aria-hidden="true" :class="styles.flip" />
        </Calendar.Next>
    </div>
</template>
