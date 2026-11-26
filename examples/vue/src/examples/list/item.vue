<script setup lang="ts">
import { Calendar, type ListItem, useCalendar } from "@fragiola/calendar-vue";
import type { Types } from "../_kit/data";
import { timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// An event of the list: a tab stop of its own; its times and title are the model's data.
defineProps<{ item: ListItem }>();
const { model } = useCalendar<Types>();
</script>

<template>
    <Calendar.ListEvent :item="item">
        <template #render="{ props, state }">
            <div v-bind="props" :class="styles.item(state)">
                <span aria-hidden="true" :class="styles.dot" />
                <span :class="styles.time">{{
                    item.allDay ? "All day" : timesOf(model, item.occurrenceId)
                }}</span>
                <span :class="styles.itemTitle">{{
                    titleOf(model, item.occurrenceId, item.eventId)
                }}</span>
            </div>
        </template>
    </Calendar.ListEvent>
</template>
