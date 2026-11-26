<script setup lang="ts">
import {
    Calendar,
    type TimeSegment,
    useCalendar,
} from "@fragiola/calendar-vue";
import { ResizeHandle } from "@fragiola/calendar-vue/resize";
import { Repeat } from "@lucide/vue";
import type { Types } from "../_kit/data";
import { timesOf, titleOf } from "../_kit/format";
import type { features } from "./planner";
import * as styles from "./styles";

// A timed event: its box, a mark when it repeats, and a handle at its end to resize it.
defineProps<{ segment: TimeSegment }>();
const { model } = useCalendar<Types, typeof features>();
</script>

<template>
    <Calendar.TimeEvent :segment="segment">
        <template #render="{ props, state }">
            <div v-bind="props" :class="styles.event(state)">
                <span :class="styles.eventBox">
                    <span :class="styles.eventTitle"
                        ><Repeat
                            v-if="
                                model.is('event-recurring', {
                                    eventId: segment.eventId,
                                })
                            "
                            aria-label="Repeats"
                            :class="styles.repeat"
                        />{{
                            titleOf(model, segment.occurrenceId, segment.eventId)
                        }}</span
                    >
                    <span :class="styles.eventTime">{{
                        timesOf(model, segment.occurrenceId)
                    }}</span>
                </span>
                <ResizeHandle edge="end" :class="styles.resizeHandle" />
            </div>
        </template>
    </Calendar.TimeEvent>
</template>
