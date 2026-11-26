<script setup lang="ts">
import { Calendar, useCalendarView } from "@fragiola/calendar-vue";
import { BusinessHours } from "@fragiola/calendar-vue/constraints";
import { DragPreview } from "@fragiola/calendar-vue/drag-and-drop";
import { NowIndicator } from "@fragiola/calendar-vue/now-indicator";
import { Selection } from "@fragiola/calendar-vue/selection";
import {
    type ComponentPublicInstance,
    computed,
    onMounted,
    useTemplateRef,
} from "vue";
import AllDayEvent from "./all-day-event.vue";
import DayHeader from "./day-header.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";

// The planner's time grid (a week, or a day): the all-day row, the slots, and over them each
// day's business hours, events, the selection, the drag preview and the now line.
const view = useCalendarView();
const days = computed(() => (view.value.type === "day" ? 1 : 7));

// a template ref on a part is its component: `$el` is its element
const scroller = useTemplateRef<ComponentPublicInstance>("scroller");
onMounted(() => scrollToMorning(scroller.value?.$el ?? null));

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}
</script>

<template>
    <Calendar.TimeGrid
        :aria-label="view.type === 'day' ? 'Day' : 'Week'"
        :class="styles.grid"
        :style="{ '--days': days }"
    >
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
            <Selection :class="styles.selection" />
            <DragPreview :class="styles.preview" />
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
                            <Calendar.Slot
                                :date="column.date"
                                :class="styles.slot"
                            />
                        </Calendar.Slots>
                    </Calendar.SlotRow>
                </Calendar.SlotRows>
                <Calendar.Columns v-slot="{ column }" :class="styles.columns">
                    <Calendar.Column :column="column" :class="styles.column">
                        <BusinessHours :class="styles.businessHours" />
                        <Calendar.ColumnEvents v-slot="{ segment }">
                            <TimedEvent :segment="segment" />
                        </Calendar.ColumnEvents>
                        <Selection :class="styles.selection" />
                        <DragPreview :class="styles.preview" />
                        <NowIndicator :class="styles.now" />
                    </Calendar.Column>
                </Calendar.Columns>
            </div>
        </Calendar.Scroller>
    </Calendar.TimeGrid>
</template>
