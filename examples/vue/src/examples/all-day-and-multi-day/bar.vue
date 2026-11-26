<script setup lang="ts">
import { Calendar, type Segment, useCalendar } from "@fragiola/calendar-vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import type { Types } from "../_kit/data";
import { titleOf } from "../_kit/format";
import * as styles from "./styles";

// A day-grid segment: square ends where the event goes on in another row, an arrow there.
defineProps<{ segment: Segment }>();
const { model } = useCalendar<Types>();
</script>

<template>
    <Calendar.Segment :segment="segment">
        <template #render="{ props, state }">
            <div v-bind="props" :class="styles.segment(state)">
                <span :class="styles.bar">
                    <ChevronLeft
                        v-if="segment.continuesBefore"
                        aria-hidden="true"
                        :class="styles.arrow"
                    />
                    <span :class="styles.barTitle">{{
                        titleOf(model, segment.occurrenceId, segment.eventId)
                    }}</span>
                    <ChevronRight
                        v-if="segment.continuesAfter"
                        aria-hidden="true"
                        :class="styles.arrow"
                    />
                </span>
            </div>
        </template>
    </Calendar.Segment>
</template>
