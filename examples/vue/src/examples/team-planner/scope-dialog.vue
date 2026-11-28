<script setup lang="ts">
import { type EditScope, useCalendar } from "@fragiola/calendar-vue";
import { onBeforeUnmount, ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Dialog } from "#/components/ui/dialog";
import type { Types } from "../_kit/data";
import {
    askForScope,
    type features,
    type PendingEdit,
    runWithScope,
} from "./planner";
import * as styles from "./styles";

// "This event, the following ones, or all of them?": asked when an occurrence of a series is moved
// or resized (planner.ts stops the edit in a middleware). Each answer is an edit scope (D15). The
// dialog holds the waiting edit itself: asking re-renders the dialog, not the planner.
const { model } = useCalendar<Types, typeof features>();
const pending = ref<PendingEdit | null>(null);

// an edit of a recurring event waits for its scope (planner.ts)
onBeforeUnmount(
    model.use(
        askForScope((edit) => {
            pending.value = edit;
        }),
    ),
);

function pick(scope: EditScope) {
    if (pending.value) runWithScope(model, pending.value, scope);
    pending.value = null;
}

function onOpenChange(next: boolean) {
    if (!next) pending.value = null;
}
</script>

<template>
    <Dialog.Root :open="pending !== null" @update:open="onOpenChange">
        <Dialog.Portal>
            <Dialog.Backdrop :class="styles.dialogBackdrop" />
            <Dialog.Content :class="styles.dialog">
                <Dialog.Header>
                    <Dialog.Title>Change a recurring event</Dialog.Title>
                    <Dialog.Description>This event repeats. Which occurrences change?</Dialog.Description>
                </Dialog.Header>
                <Dialog.Footer :class="styles.scopeFooter">
                    <Dialog.Close as-child>
                        <Clickable.Button variant="outline">Cancel</Clickable.Button>
                    </Dialog.Close>
                    <Clickable.Button variant="outline" @click="pick('this')">This event</Clickable.Button>
                    <Clickable.Button variant="outline" @click="pick('following')">This and following</Clickable.Button>
                    <Clickable.Button :class="styles.primary" @click="pick('all')">All events</Clickable.Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
</template>
