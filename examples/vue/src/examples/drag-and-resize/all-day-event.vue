<script setup lang="ts">
import { Calendar, type Segment, useCalendar } from "@fragiola/calendar-vue";
import { ResizeHandle } from "@fragiola/calendar-vue/resize";
import type { Types } from "../_kit/data";
import { titleOf } from "../_kit/format";
import * as styles from "./styles";

// A day-grid event: resized from its end day (an all-day event's last day).
defineProps<{ segment: Segment }>();
const { model } = useCalendar<Types>();
</script>

<template>
    <Calendar.Segment :segment="segment">
        <template #render="{ props, state }">
            <div v-bind="props" :class="styles.segment(state)">
                <span :class="styles.segmentLabel">{{
                    titleOf(model, segment.occurrenceId, segment.eventId)
                }}</span>
                <ResizeHandle
                    v-if="!segment.continuesAfter"
                    edge="end"
                    :class="styles.segmentHandle"
                />
            </div>
        </template>
    </Calendar.Segment>
</template>
