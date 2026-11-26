<script setup lang="ts">
import {
    createCalendarModel,
    type EditScope,
    type SelectionRange,
    typedCalendar,
} from "@fragiola/calendar-vue";
import { onBeforeUnmount, ref } from "vue";
import { CALENDARS, day, type Types } from "../_kit/data";
import CalendarsPanel from "./calendars-panel.vue";
import EventEditor, { type NewEvent } from "./event-editor.vue";
import MiniMonth from "./mini-month.vue";
import {
    askForScope,
    features,
    type PendingEdit,
    plannerEvents,
    runWithScope,
} from "./planner";
import PlannerGrid from "./planner-grid.vue";
import ScopeDialog from "./scope-dialog.vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";

// A team's week, every feature at once: a calendar per person (shown or hidden from the panel), a
// mini month to jump around, events to drag and resize, a range to select that opens an editor, a
// daily standup whose edits ask "this, following or all?", and business hours shaded in the grid.
// the namespace typed by the registry and the features: the root takes this model and `@select`
const Calendar = typedCalendar<Types, typeof features>();
const model = createCalendarModel<Types, typeof features>(
    {
        version: 1,
        events: plannerEvents(),
        calendars: CALENDARS,
        settings: {
            businessHours: [
                {
                    daysOfWeek: [1, 2, 3, 4, 5],
                    startTime: "08:00",
                    endTime: "18:00",
                },
            ],
        },
        view: { type: "week", anchorDate: day() },
    },
    { features },
);
const range = ref<SelectionRange | null>(null);
const pending = ref<PendingEdit | null>(null);

// an edit of a recurring event waits for its scope (planner.ts)
onBeforeUnmount(
    model.use(
        askForScope((edit) => {
            pending.value = edit;
        }),
    ),
);

function closeEditor() {
    range.value = null;
    model.run("selection.clear", {});
}

function save({ title, calendarId, range }: NewEvent) {
    model.run("event.add", {
        kind: "meeting",
        title,
        calendarId,
        start: range.start,
        end: range.end,
        allDay: range.allDay,
    });
    closeEditor();
}

function pick(scope: EditScope) {
    if (pending.value) runWithScope(model, pending.value, scope);
    pending.value = null;
}

/** A selected range in words, for the editor's description. */
function when(range: SelectionRange, locale: string): string {
    if (range.allDay) return `All day from ${range.start}`;
    return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
    }).formatRange(Date.parse(range.start), Date.parse(range.end));
}
</script>

<template>
    <Calendar.Root
        :model="model"
        :class="styles.root"
        @select="(event) => (range = event.range)"
    >
        <aside aria-label="Planner" :class="styles.sidebar">
            <MiniMonth />
            <CalendarsPanel />
        </aside>
        <div :class="styles.main">
            <Toolbar />
            <PlannerGrid />
        </div>
        <EventEditor
            :range="range"
            :when="range ? when(range, model.state.settings.locale) : ''"
            @save="save"
            @close="closeEditor"
        />
        <ScopeDialog
            :open="pending !== null"
            @pick="pick"
            @cancel="pending = null"
        />
    </Calendar.Root>
</template>
