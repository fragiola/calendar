<script setup lang="ts">
import {
    Calendar,
    type TimeSegment,
    useCalendar,
} from "@fragiola/calendar-vue";
import { Ban, MapPin, Video } from "@lucide/vue";
import { computed } from "vue";
import { timesOf } from "../_kit/format";
import { cancelled, ICONS, type Types } from "./kinds";
import * as styles from "./styles";

// The event's content, from its kind and data: an icon, the title, the times, the room or the
// call's link, the attendees' initials; a cancelled event says so in its name too.
const props = defineProps<{ segment: TimeSegment }>();
const { model } = useCalendar<Types>();

// the segment is a new object whenever its event changes (D11), so this re-reads the model then
const event = computed(() =>
    model.get("event-by", { id: props.segment.eventId }),
);
const icon = computed(() => ICONS[event.value?.kind ?? "focus"]);
const isCancelled = computed(() => cancelled(event.value));
// `kind` narrows `data`: a meeting and a call have attendees, a focus block none
const people = computed(() =>
    event.value?.kind === "meeting" || event.value?.kind === "call"
        ? (event.value.data?.attendees ?? [])
        : [],
);
</script>

<template>
    <Calendar.TimeEvent
        v-if="event"
        :segment="segment"
        :aria-label="`${event.title}${isCancelled ? ' (cancelled)' : ''}`"
        :data-kind="event.kind"
    >
        <template #render="{ props: part, state }">
            <div
                v-bind="part"
                :class="styles.event({ ...state, cancelled: isCancelled })"
            >
                <span :class="styles.eventBox">
                    <span :class="styles.eventHead">
                        <Ban
                            v-if="isCancelled"
                            aria-hidden="true"
                            :class="styles.kindIcon"
                        />
                        <component
                            :is="icon"
                            v-else
                            aria-hidden="true"
                            :class="styles.kindIcon"
                        />
                        <span data-title :class="styles.eventTitle">{{
                            event.title
                        }}</span>
                    </span>
                    <span :class="styles.eventTime">{{
                        timesOf(model, segment.occurrenceId)
                    }}</span>
                    <span
                        v-if="event.kind === 'meeting'"
                        :class="styles.eventDetail"
                    >
                        <MapPin aria-hidden="true" :class="styles.detailIcon" />{{
                            event.data?.room
                        }}</span>
                    <span
                        v-if="event.kind === 'call'"
                        :class="styles.eventDetail"
                    >
                        <Video aria-hidden="true" :class="styles.detailIcon" />{{
                            event.data?.link
                        }}</span>
                    <span
                        v-if="people.length > 0"
                        :class="styles.attendees"
                    >
                        <span
                            v-for="person in people"
                            :key="person"
                            :title="person"
                            :class="styles.attendee"
                            >{{ person.slice(0, 1) }}</span
                        >
                    </span>
                </span>
            </div>
        </template>
    </Calendar.TimeEvent>
</template>
