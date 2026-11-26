<script setup lang="ts">
import {
    type CalendarEventJson,
    createCalendarModel,
    typedCalendar,
} from "@fragiola/calendar-vue";
import { at, CALENDARS, day, weekday } from "../_kit/data";
import DayHeader from "./day-header.vue";
import EventCard from "./event-card.vue";
import type { Types } from "./kinds";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";

const EVENTS: CalendarEventJson<Types>[] = [
    {
        id: "planning",
        kind: "meeting",
        title: "Sprint planning",
        start: at(weekday(1), "10:00"),
        end: at(weekday(1), "11:30"),
        allDay: false,
        calendarId: "ada",
        data: { room: "Atlas", attendees: ["Ada", "Grace", "Alan"] },
    },
    {
        id: "customer",
        kind: "call",
        title: "Customer call",
        start: at(weekday(2), "13:00"),
        end: at(weekday(2), "14:00"),
        allDay: false,
        calendarId: "grace",
        data: {
            link: "meet.example.com/acme",
            attendees: ["Grace", "Katherine"],
        },
    },
    {
        id: "deep-work",
        kind: "focus",
        title: "Focus: billing API",
        start: at(weekday(3), "09:00"),
        end: at(weekday(3), "12:00"),
        allDay: false,
        calendarId: "alan",
    },
    {
        id: "design",
        kind: "meeting",
        title: "Design review",
        start: at(weekday(4), "14:00"),
        end: at(weekday(4), "15:30"),
        allDay: false,
        calendarId: "katherine",
        data: {
            room: "Lisbon",
            attendees: ["Katherine", "Ada"],
            cancelled: true,
        },
    },
    {
        id: "partner",
        kind: "call",
        title: "Partner sync",
        start: at(weekday(5), "10:00"),
        end: at(weekday(5), "11:00"),
        allDay: false,
        calendarId: "company",
        data: { link: "meet.example.com/partner", attendees: ["Alan"] },
    },
];

// Events drawn from their typed data: the event's element is the calendar's (it places itself,
// takes focus, carries its state), and everything inside it is yours.
// the namespace typed by the registry: the root takes this model (a template passes no type argument)
const Calendar = typedCalendar<Types>();
const model = createCalendarModel<Types>({
    version: 1,
    events: EVENTS,
    calendars: CALENDARS,
    settings: { slotMinTime: "08:00", slotMaxTime: "18:00" },
    view: { type: "week", anchorDate: day() },
});
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <Calendar.TimeGrid aria-label="Week" :class="styles.grid">
            <Calendar.ColumnHeaders v-slot="{ date }" :class="styles.headers">
                <DayHeader :date="date" />
            </Calendar.ColumnHeaders>
            <Calendar.Scroller :class="styles.scroller">
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
                            <Calendar.ColumnEvents v-slot="{ segment }">
                                <EventCard :segment="segment" />
                            </Calendar.ColumnEvents>
                        </Calendar.Column>
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    </Calendar.Root>
</template>
