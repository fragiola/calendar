<script setup lang="ts">
import {
    type CalendarEngineEventOf,
    createCalendarModel,
    typedCalendar,
} from "@fragiola/calendar-vue";
import { selection } from "@fragiola/calendar-vue/selection";
import { ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { Dialog } from "#/components/ui/dialog";
import { Field } from "#/components/ui/field";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";
import WeekGrid from "./week-grid.vue";

const FEATURES = [selection()] as const;

type Range = CalendarEngineEventOf<"select">["range"];

// Select to create: drag over the slots (or the all-day row), or Shift + arrows then Enter, and
// the selected range opens an editor. Saving runs `event.add` with the range's times; either way
// the selection is cleared. The editor is the app's: the package ships none.
// the namespace typed by the registry and the features: the root takes this model and `@select`
const Calendar = typedCalendar<Types, typeof FEATURES>();
const model = createCalendarModel<Types, typeof FEATURES>(
    {
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        view: { type: "week", anchorDate: day() },
    },
    { features: FEATURES },
);
const range = ref<Range | null>(null);
const title = ref("");

function close() {
    range.value = null;
    title.value = "";
    model.run("selection.clear", {});
}

function save() {
    if (!range.value) return;
    model.run("event.add", {
        title: title.value.trim() || "New event",
        start: range.value.start,
        end: range.value.end,
        allDay: range.value.allDay,
        calendarId: "ada",
        kind: "meeting",
    });
    close();
}

function onOpenChange(open: boolean) {
    if (!open) close();
}

/** The range in words (app formatting: the calendar gives the times as data). */
function when(range: Range): string {
    if (range.allDay) {
        return `All day, from ${range.start} to before ${range.end}`;
    }
    const format = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
    });
    return format.formatRange(Date.parse(range.start), Date.parse(range.end));
}
</script>

<template>
    <Calendar.Root
        :model="model"
        :class="styles.root"
        @select="(event) => (range = event.range)"
    >
        <Toolbar />
        <WeekGrid />
        <Dialog.Root :open="range !== null" @update:open="onOpenChange">
            <Dialog.Portal>
                <Dialog.Backdrop />
                <Dialog.Content>
                    <form @submit.prevent="save">
                        <Dialog.Header>
                            <Dialog.Title>New event</Dialog.Title>
                            <Dialog.Description>{{
                                range ? when(range) : ""
                            }}</Dialog.Description>
                        </Dialog.Header>
                        <Dialog.Body>
                            <Field.Root>
                                <Field.Label>Title</Field.Label>
                                <Field.Row>
                                    <Field.Body>
                                        <Input
                                            v-model="title"
                                            placeholder="New event"
                                        />
                                    </Field.Body>
                                </Field.Row>
                            </Field.Root>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.Close as-child>
                                <Clickable.Button variant="outline">Cancel</Clickable.Button>
                            </Dialog.Close>
                            <Clickable.Button type="submit" :class="styles.primary">Save</Clickable.Button>
                        </Dialog.Footer>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    </Calendar.Root>
</template>
