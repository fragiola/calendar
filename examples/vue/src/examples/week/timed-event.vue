<script setup lang="ts">
import {
    Calendar,
    type TimeSegment,
    useCalendar,
} from "@fragiola/calendar-vue";
import type { Types } from "../_kit/data";
import { timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// A timed event places itself in its column (its times, its overlap columns); you draw its box.
defineProps<{ segment: TimeSegment }>();
const { model } = useCalendar<Types>();
</script>

<template>
    <Calendar.TimeEvent :segment="segment">
        <template #render="{ props, state }">
            <div v-bind="props" :class="styles.event(state)">
                <span :class="styles.eventBox" data-testid="event-box">
                    <span :class="styles.eventTitle">{{
                        titleOf(model, segment.occurrenceId, segment.eventId)
                    }}</span>
                    <span :class="styles.eventTime">{{
                        timesOf(model, segment.occurrenceId)
                    }}</span>
                </span>
            </div>
        </template>
    </Calendar.TimeEvent>
</template>
