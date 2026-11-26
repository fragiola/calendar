<script setup lang="ts">
import type { EditScope } from "@fragiola/calendar-vue";
import { Clickable } from "#/components/atoms/clickable";
import { Dialog } from "#/components/ui/dialog";
import * as styles from "./styles";

// "This event, the following ones, or all of them?": asked when an occurrence of a series is moved
// or resized (planner.ts stops the edit in a middleware). Each answer is an edit scope (D15).
defineProps<{ open: boolean }>();
const emit = defineEmits<{ pick: [scope: EditScope]; cancel: [] }>();

function onOpenChange(next: boolean) {
    if (!next) emit("cancel");
}
</script>

<template>
    <Dialog.Root :open="open" @update:open="onOpenChange">
        <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Content>
                <Dialog.Header>
                    <Dialog.Title>Change a recurring event</Dialog.Title>
                    <Dialog.Description>This event repeats. Which occurrences change?</Dialog.Description>
                </Dialog.Header>
                <Dialog.Footer :class="styles.scopeFooter">
                    <Dialog.Close as-child>
                        <Clickable.Button variant="outline">Cancel</Clickable.Button>
                    </Dialog.Close>
                    <Clickable.Button variant="outline" @click="emit('pick', 'this')">This event</Clickable.Button>
                    <Clickable.Button variant="outline" @click="emit('pick', 'following')">This and following</Clickable.Button>
                    <Clickable.Button :class="styles.primary" @click="emit('pick', 'all')">All events</Clickable.Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
</template>
