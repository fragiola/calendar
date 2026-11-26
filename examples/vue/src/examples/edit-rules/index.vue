<script setup lang="ts">
import {
    createCalendarModel,
    typedCalendar,
    veto,
} from "@fragiola/calendar-vue";
import { dragAndDrop } from "@fragiola/calendar-vue/drag-and-drop";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";
import WeekGrid from "./week-grid.vue";

const FEATURES = [dragAndDrop()] as const;
const Calendar = typedCalendar<Types, typeof FEATURES>();

// Edit rules live in the model, so a drag asks it before showing a preview and a refused drop
// runs nothing:
// - the company's calendar is read-only (`editable: false` on the calendar);
// - the candidate interview may not move (`startEditable: false` on the event);
// - an app rule, in a middleware: nothing moves to a time already past. A middleware runs around
//   every command, a drag's dry runs included, so the preview hides over the past as well.
function createModel() {
    const model = createCalendarModel<Types, typeof FEATURES>(
        {
            version: 1,
            events: teamWeek().map((event) =>
                event.id === "interview"
                    ? { ...event, startEditable: false }
                    : event,
            ),
            calendars: CALENDARS.map((calendar) =>
                calendar.id === "company"
                    ? { ...calendar, editable: false }
                    : calendar,
            ),
            view: { type: "week", anchorDate: day() },
        },
        { features: FEATURES },
    );
    model.use((ctx, next) => {
        if (ctx.command !== "event.move") return next();
        const result = next();
        if (
            result.ok &&
            Date.parse((result.value as { start: string }).start) < Date.now()
        ) {
            return veto("an event cannot move into the past");
        }
        return result;
    });
    return model;
}

const model = createModel();
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <Toolbar />
        <ul aria-label="Rules" :class="styles.rules">
            <li>Company events are read-only.</li>
            <li>The interview is locked in place.</li>
            <li>Nothing moves into the past.</li>
        </ul>
        <WeekGrid />
    </Calendar.Root>
</template>
