<script setup lang="ts">
import { type EditScope, useCalendar, veto } from "@fragiola/calendar-vue";
import type { recurrence } from "@fragiola/calendar-vue/recurrence";
import { onBeforeUnmount, ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Dialog } from "#/components/ui/dialog";
import type { Types } from "../_kit/data";
import * as styles from "./styles";

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

// The dialog holds the edit waiting for its scope: asking re-renders the dialog, not the calendar.
const { model } = useCalendar<
    Types,
    readonly [ReturnType<typeof recurrence>]
>();
const pending = ref<Pending | null>(null);

onBeforeUnmount(
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
    }),
);

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
    <Dialog.Root :open="pending !== null" @update:open="onOpenChange">
        <Dialog.Portal>
            <Dialog.Backdrop :class="styles.dialogBackdrop" />
            <Dialog.Content :class="styles.dialog">
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
</template>
