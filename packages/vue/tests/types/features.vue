<script setup lang="ts">
// Type fixtures (checked by `vue-tsc`, never run): `typedCalendar<T, F>()` types the root's
// model, its v-models and its features' events in a template; the composables and the calendar
// ref are typed by the model's features. `@vue-expect-error` / `@ts-expect-error` mark what must
// not compile.
import { ref } from "vue";
import {
    type CalendarEngineEventOf,
    type CalendarEventOf,
    type CalendarTypes,
    createCalendarModel,
    typedCalendar,
    useCalendarRef,
} from "../../src";
import { dragAndDrop } from "../../src/drag-and-drop";
import { selection } from "../../src/selection";

type Types = CalendarTypes & {
    events: { meeting: { room: string }; task: undefined };
};

const features = [selection(), dragAndDrop()] as const;
const model = createCalendarModel<Types, typeof features>(undefined, {
    features,
});
const bare = createCalendarModel<Types>();

const Calendar = typedCalendar<Types, typeof features>();
const Bare = typedCalendar<Types>();

const calendar = useCalendarRef<Types, typeof features>();
void calendar.value?.engine.get("drag-preview");
void calendar.value?.engine.get("selection-segments");
const without = useCalendarRef<Types>();
// @ts-expect-error the drag and drop feature is not installed
void without.value?.engine.get("drag-preview");

const events = ref<readonly CalendarEventOf<Types>[]>([]);
const view = ref<"month" | "week">("month");
const date = ref("2026-11-26");

function onSelect(event: CalendarEngineEventOf<"select">) {
    void event.range.start;
}
function onDrop(event: CalendarEngineEventOf<"drop">) {
    void event.start;
}
function onEvents(next: readonly CalendarEventOf<Types>[]) {
    void next[0]?.data;
}
</script>

<template>
    <Calendar.Root
        :model="model"
        :calendar-ref="calendar"
        v-model:events="events"
        v-model:view="view"
        v-model:date="date"
        @events-change="onEvents"
        @select="onSelect"
        @event-drop="onDrop"
        @event-click="(event) => void event.eventId"
    >
        <Calendar.DayGrid>
            <Calendar.Weeks v-slot="{ week }">
                <Calendar.Week :week="week">
                    <template #day="{ day }">
                        <Calendar.Day :day="day" v-slot="{ segments, focused }">
                            {{ segments.length }} {{ focused }}
                        </Calendar.Day>
                    </template>
                </Calendar.Week>
            </Calendar.Weeks>
        </Calendar.DayGrid>
    </Calendar.Root>
    <!-- @vue-expect-error select needs the selection feature -->
    <Bare.Root :model="bare" @select="onSelect" />
    <!-- @vue-expect-error event-drop needs dragAndDrop() or resize() -->
    <Bare.Root :model="bare" @event-drop="onDrop" />
    <Bare.Root :model="bare" @date-click="(event) => void event.date" />
    <!-- @vue-expect-error a root's features type its model -->
    <Bare.Root :model="model" />
    <!-- @vue-expect-error a week takes a day-grid row -->
    <Calendar.Week :week="date" />
</template>
