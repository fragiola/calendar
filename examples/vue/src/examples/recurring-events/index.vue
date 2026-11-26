<script setup lang="ts">
import {
    createCalendarModel,
    type EditScope,
    typedCalendar,
    veto,
} from "@fragiola/calendar-vue";
import { dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { recurrence } from "@fragiola/calendar-vue/recurrence";
import { resize } from "@fragiola/calendar-vue/resize";
import { ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Dialog } from "#/components/ui/dialog";
import {
    at,
    CALENDARS,
    day,
    type Types,
    teamWeek,
    weekday,
} from "../_kit/data";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";
import WeekGrid from "./week-grid.vue";

const FEATURES = [recurrence(), dragAndDrop(), resize()] as const;

/** A move or a resize of an occurrence of a series, waiting for the user's scope. */
interface Pending {
    command: "event.move" | "event.resize";
    payload: Record<string, unknown>;
    title: string;
}

/** The `meta` of a command the user already scoped: the middleware lets it through. */
const SCOPED = { scoped: true } as const;

const SCOPES: { scope: EditScope; label: string }[] = [
    { scope: "this", label: "This event" },
    { scope: "following", label: "This and following events" },
    { scope: "all", label: "All events" },
];

// Recurring events: a weekday standup and a monthly review, RFC 5545 rules expanded over what the
// view shows. A drop or a resize of one occurrence asks which ones it changes (the package never
// asks: here a middleware holds the command, a dialog asks, and the command runs again with the
// scope chosen: `this` overrides the occurrence, `following` splits the series, `all` changes it).
// the namespace typed by the registry and the features: the root takes this model
const Calendar = typedCalendar<Types, typeof FEATURES>();
const pending = ref<Pending | null>(null);
const model = createCalendarModel<Types, typeof FEATURES>(
    {
        version: 1,
        events: [
            ...teamWeek(),
            {
                id: "standup",
                kind: "meeting",
                title: "Standup",
                start: at(weekday(1, -1), "09:00"),
                end: at(weekday(1, -1), "09:30"),
                allDay: false,
                calendarId: "ada",
                recurrence: {
                    rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
                },
            },
            {
                id: "review",
                kind: "meeting",
                title: "Monthly review",
                start: at(weekday(5), "13:00"),
                end: at(weekday(5), "14:00"),
                allDay: false,
                calendarId: "company",
                recurrence: { rule: "FREQ=MONTHLY;COUNT=12" },
            },
        ],
        calendars: CALENDARS,
        view: { type: "week", anchorDate: day() },
    },
    { features: FEATURES },
);
model.use((ctx, next) => {
    if (
        ctx.dryRun ||
        ctx.meta?.scoped === true ||
        (ctx.command !== "event.move" && ctx.command !== "event.resize")
    ) {
        return next();
    }
    const { eventId, occurrenceId } = ctx.payload;
    const event = ctx.get("event-by", { id: eventId });
    if (occurrenceId === undefined || event?.recurrence === undefined) {
        return next();
    }
    pending.value = {
        command: ctx.command,
        payload: { ...ctx.payload },
        title: event.title,
    };
    return veto("waiting for the user's scope");
});

function choose(scope: EditScope) {
    if (!pending.value) return;
    model.run(
        pending.value.command,
        { ...pending.value.payload, scope } as never,
        { meta: SCOPED },
    );
    pending.value = null;
}

function onOpenChange(open: boolean) {
    if (!open) pending.value = null;
}
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <WeekGrid />
        <Dialog.Root :open="pending !== null" @update:open="onOpenChange">
            <Dialog.Portal>
                <Dialog.Backdrop />
                <Dialog.Content>
                    <Dialog.Header>
                        <Dialog.Title>Edit recurring event</Dialog.Title>
                        <Dialog.Description>{{
                            `“${pending?.title ?? ""}” repeats. Change which events?`
                        }}</Dialog.Description>
                    </Dialog.Header>
                    <Dialog.Body :class="styles.scopes">
                        <Clickable.Button
                            v-for="{ scope, label } in SCOPES"
                            :key="scope"
                            variant="outline"
                            :class="styles.scope"
                            @click="choose(scope)"
                            >{{ label }}</Clickable.Button
                        >
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Dialog.Close as-child>
                            <Clickable.Button variant="ghost">Cancel</Clickable.Button>
                        </Dialog.Close>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    </Calendar.Root>
</template>
