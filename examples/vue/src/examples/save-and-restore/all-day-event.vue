<script setup lang="ts">
import { Calendar, type Segment, useCalendar } from "@fragiola/calendar-vue";
import type { Types } from "../_kit/data";
import { titleOf } from "../_kit/format";
import * as styles from "./styles";

// Its look follows its state (its calendar's palette): the `render` slot hands that state.
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
            </div>
        </template>
    </Calendar.Segment>
</template>
