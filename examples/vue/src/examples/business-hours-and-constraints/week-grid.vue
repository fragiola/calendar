<script setup lang="ts">
import { Calendar } from "@fragiola/calendar-vue";
import { BusinessHours } from "@fragiola/calendar-vue/constraints";
import { DragPreview } from "@fragiola/calendar-vue/drag-and-drop";
import { onMounted, useTemplateRef } from "vue";
import AllDayEvent from "./all-day-event.vue";
import DayHeader from "./day-header.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null | undefined) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}

const scroller = useTemplateRef<{ $el: HTMLElement }>("scroller");
onMounted(() => scrollToMorning(scroller.value?.$el));
</script>

<template>
    <Calendar.TimeGrid aria-label="Week" :class="styles.grid">
        <Calendar.ColumnHeaders v-slot="{ date }" :class="styles.headers">
            <DayHeader :date="date" />
        </Calendar.ColumnHeaders>
        <Calendar.AllDayRow :class="styles.allDayRow">
            <div aria-hidden="true" :class="styles.allDayLabel">all-day</div>
            <Calendar.Days v-slot="{ day }">
                <Calendar.Day :day="day" :class="styles.allDayCell">
                    <Calendar.DayEvents v-slot="{ segment }">
                        <AllDayEvent :segment="segment" />
                    </Calendar.DayEvents>
                </Calendar.Day>
            </Calendar.Days>
            <DragPreview :class="styles.rowPreview" />
        </Calendar.AllDayRow>
        <Calendar.Scroller ref="scroller" :class="styles.scroller">
            <div :class="styles.body">
                <Calendar.SlotRows v-slot="{ slot }">
                    <Calendar.SlotRow :slot="slot" :class="styles.slotRow">
                        <Calendar.SlotLabel :class="styles.slotLabel">
                            <SlotTime
                                v-if="slot.time.endsWith(':00')"
                                :time="slot.time"
                            />
                        </Calendar.SlotLabel>
                        <Calendar.Slots v-slot="{ column }">
                            <Calendar.Slot :date="column.date" :class="styles.slot" />
                        </Calendar.Slots>
                    </Calendar.SlotRow>
                </Calendar.SlotRows>
                <Calendar.Columns v-slot="{ column }" :class="styles.columns">
                    <Calendar.Column :column="column" :class="styles.column">
                        <!-- the day's business hours, under its events -->
                        <BusinessHours :class="styles.businessHours" />
                        <Calendar.ColumnEvents v-slot="{ segment }">
                            <TimedEvent :segment="segment" />
                        </Calendar.ColumnEvents>
                        <!-- shown only where the constraints allow the event -->
                        <DragPreview :class="styles.preview" />
                    </Calendar.Column>
                </Calendar.Columns>
            </div>
        </Calendar.Scroller>
    </Calendar.TimeGrid>
</template>
