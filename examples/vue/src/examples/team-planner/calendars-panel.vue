<script setup lang="ts">
import { CALENDARS } from "../_kit/data";
import CalendarToggle from "./calendar-toggle.vue";
import * as styles from "./styles";

// The calendars panel: one checkbox per person, showing or hiding their events with
// `calendar.set-visible` (model state: an AI or a server could do the same).
</script>

<template>
    <section aria-labelledby="planner-calendars" :class="styles.panelSection">
        <h3 id="planner-calendars" :class="styles.panelHeading">Calendars</h3>
        <ul :class="styles.calendarList">
            <CalendarToggle
                v-for="calendar in CALENDARS"
                :id="calendar.id ?? ''"
                :key="calendar.id"
                :title="calendar.title"
            />
        </ul>
    </section>
</template>
