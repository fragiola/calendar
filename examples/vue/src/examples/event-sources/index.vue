<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import { eventSources } from "@fragiola/calendar-vue/event-sources";
import { LoaderCircle } from "@lucide/vue";
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from "vue";
import { CALENDARS, day, type Types } from "../_kit/data";
import AllDayEvent from "./all-day-event.vue";
import DayHeader from "./day-header.vue";
import Navigation from "./navigation.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";
import Title from "./title.vue";
import { useFetchMissing } from "./use-fetch-missing";

const features = [eventSources()] as const;

// The events come from a server (a fake one with latency, _kit/fake-server.ts). The feature keeps
// what was fetched and what is loading, and says which days of the view are missing
// (`get("ranges-to-fetch")`); fetching is the app's: on every change, fetch what is missing,
// mark it loading, then hand the events to `event-sources.receive`. Go to next week: its days load.
const Calendar = typedCalendar<Types, typeof features>();
const model = createCalendarModel<Types, typeof features>(
    {
        version: 1,
        events: [],
        calendars: CALENDARS,
        settings: { eventSources: [{ id: "team" }] },
        view: { type: "week", anchorDate: day() },
    },
    { features },
);
useFetchMissing(model);

// whether a range is loading, kept in step with the model
const isLoading = () => model.is("event-source-loading", {});
const loading = shallowRef(isLoading());
let stop: (() => void) | undefined;
onMounted(() => {
    stop = model.subscribe(() => {
        loading.value = isLoading();
    });
    loading.value = isLoading();
});
onBeforeUnmount(() => stop?.());

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null | undefined) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}

const scroller = useTemplateRef<{ $el: HTMLElement }>("scroller");
onMounted(() => scrollToMorning(scroller.value?.$el));
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root" :aria-busy="loading">
        <div :class="styles.toolbar">
            <Title />
            <span role="status" :class="styles.status"
                ><template v-if="loading"
                    ><LoaderCircle
                        aria-hidden="true"
                        :class="styles.spinner"
                    />Loading events…</template
                ><template v-else>Up to date</template></span
            >
            <Navigation />
        </div>
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
                            <Calendar.ColumnEvents v-slot="{ segment }">
                                <TimedEvent :segment="segment" />
                            </Calendar.ColumnEvents>
                        </Calendar.Column>
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    </Calendar.Root>
</template>
