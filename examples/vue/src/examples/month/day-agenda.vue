<script setup lang="ts">
import { Calendar, useCalendar } from "@fragiola/calendar-vue";
import type { Types } from "../_kit/data";
import { dayText, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

const { model } = useCalendar<Types>();
</script>

<template>
    <Calendar.List :class="styles.agenda">
        <Calendar.ListDays v-slot="{ day }">
            <section :key="day.date" :class="styles.agendaDay">
                <h3 :class="styles.agendaHeading">
                    {{ dayText(day.date, model.state.settings.locale) }}
                </h3>
                <Calendar.ListDay
                    v-slot="{ item }"
                    :day="day"
                    :class="styles.agendaList"
                >
                    <Calendar.ListEvent :item="item">
                        <template #render="{ props, state }">
                            <div v-bind="props" :class="styles.agendaItem(state)">
                                <span :class="styles.agendaTime">{{
                                    item.allDay
                                        ? "all day"
                                        : timesOf(model, item.occurrenceId)
                                }}</span>
                                <span>{{
                                    titleOf(model, item.occurrenceId, item.eventId)
                                }}</span>
                            </div>
                        </template>
                    </Calendar.ListEvent>
                </Calendar.ListDay>
            </section>
        </Calendar.ListDays>
    </Calendar.List>
</template>
