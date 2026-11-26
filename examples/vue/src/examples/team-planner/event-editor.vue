<script setup lang="ts">
import type { SelectionRange } from "@fragiola/calendar-vue";
import { ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { Dialog } from "#/components/ui/dialog";
import { Field } from "#/components/ui/field";
import { Select } from "#/components/ui/select";
import { CALENDARS } from "../_kit/data";
import * as styles from "./styles";

/** The calendars a new event may go to, for the select. */
const CALENDAR_ITEMS = Object.fromEntries(
    CALENDARS.map((calendar) => [calendar.id ?? "", calendar.title]),
);

/** What the editor saves: a title and a calendar for the selected range. */
export interface NewEvent {
    title: string;
    calendarId: string;
    range: SelectionRange;
}

// The event editor: a dialog of the app's (the package ships none), opened by a selected range.
// Saving emits `save` (index.vue runs `event.add`); closing it clears the selection.
const props = defineProps<{ range: SelectionRange | null; when: string }>();
const emit = defineEmits<{ save: [event: NewEvent]; close: [] }>();
const title = ref("");
const calendarId = ref("ada");

function submit() {
    if (!props.range) return;
    emit("save", {
        title: title.value.trim() || "New event",
        calendarId: calendarId.value,
        range: props.range,
    });
    title.value = "";
}

function onOpenChange(open: boolean) {
    if (!open) emit("close");
}

function onCalendar(value: unknown) {
    if (typeof value === "string") calendarId.value = value;
}
</script>

<template>
    <Dialog.Root :open="range !== null" @update:open="onOpenChange">
        <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Content>
                <form :class="styles.form" @submit.prevent="submit">
                    <Dialog.Header>
                        <Dialog.Title>New event</Dialog.Title>
                        <Dialog.Description>{{ when }}</Dialog.Description>
                    </Dialog.Header>
                    <Dialog.Body>
                        <Field.Root>
                            <Field.Label>Title</Field.Label>
                            <Field.Row>
                                <Field.Body>
                                    <Input
                                        v-model="title"
                                        autofocus
                                        placeholder="New event"
                                    />
                                </Field.Body>
                            </Field.Row>
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>Calendar</Field.Label>
                            <Select.Root
                                :items="CALENDAR_ITEMS"
                                :model-value="calendarId"
                                @update:model-value="onCalendar"
                            >
                                <Select.Trigger>
                                    <Select.Value />
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item
                                        v-for="calendar in CALENDARS"
                                        :key="calendar.id"
                                        :value="calendar.id ?? ''"
                                        >{{ calendar.title }}</Select.Item
                                    >
                                </Select.Content>
                            </Select.Root>
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
</template>
