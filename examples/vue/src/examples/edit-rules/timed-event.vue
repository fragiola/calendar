<script setup lang="ts">
import {
    Calendar,
    type TimeSegment,
    useCalendar,
} from "@fragiola/calendar-vue";
import { Lock } from "@lucide/vue";
import type { Types } from "../_kit/data";
import { timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// A locked event says so with an icon: its permissions come from the model, which decides them
// from the event's flags, its calendar's and the settings'.
defineProps<{ segment: TimeSegment }>();
const { model } = useCalendar<Types>();

function locked(eventId: string) {
    const permissions = model.get("event-permissions-by", { eventId });
    return permissions !== undefined && !permissions.startEditable;
}
</script>

<template>
    <Calendar.TimeEvent :segment="segment">
        <template #render="{ props, state }">
            <div v-bind="props" :class="styles.event(state)">
                <span :class="styles.eventBox">
                    <span :class="styles.eventTitle"><Lock
                            v-if="locked(segment.eventId)"
                            aria-label="Locked"
                            :class="styles.lock"
                        />{{
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
