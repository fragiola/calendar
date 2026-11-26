<script setup lang="ts">
import { Calendar, useCalendar } from "@fragiola/calendar-vue";
import { Popover } from "#/components/ui/popover";
import type { Types } from "../_kit/data";
import { dayText, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// The popover of a day: its trigger is the day's "+N more" (rendered only while some events do
// not fit). The engine's `more-click` opens it (the root's `@more-click`); a press on the trigger
// is that click, so the trigger's own toggle is undone, and Escape or a press outside close it.
const props = defineProps<{ date: string; open: boolean }>();
const emit = defineEmits<{ open: []; close: [] }>();
const { model } = useCalendar<Types>();

/** The day's events, read as the open popover renders. */
function items() {
    return (
        model.get("list").days.find((one) => one.date === props.date)?.items ??
        []
    );
}

function onOpenChange(next: boolean) {
    if (!next) emit("close");
}

// Reka UI's trigger toggles the popover on its click and gives no reason (React cancels the
// `trigger-press` one): the More's own click runs after it (`as-child` merges the trigger's
// listener first), so a press on an open popover's "+N more" opens it again in the same tick
function onPress() {
    emit("open");
}
</script>

<template>
    <Popover.Root :open="open" @update:open="onOpenChange">
        <Popover.Trigger as-child>
            <Calendar.More
                v-slot="{ hiddenCount }"
                :class="styles.more"
                @click="onPress"
                >+{{ hiddenCount }} more</Calendar.More
            >
        </Popover.Trigger>
        <Popover.Content align="start" :side-offset="4" :class="styles.popover">
            <div :class="styles.popoverBody">
                <Popover.Title :class="styles.popoverTitle">{{
                    dayText(date, model.state.settings.locale)
                }}</Popover.Title>
                <ul :class="styles.popoverList">
                    <li
                        v-for="item in items()"
                        :key="item.occurrenceId"
                        :class="styles.popoverItem"
                    >
                        <span :class="styles.popoverTime">{{
                            item.allDay
                                ? "All day"
                                : timesOf(model, item.occurrenceId)
                        }}</span>
                        <span :class="styles.popoverEventTitle">{{
                            titleOf(model, item.occurrenceId, item.eventId)
                        }}</span>
                    </li>
                </ul>
            </div>
        </Popover.Content>
    </Popover.Root>
</template>
