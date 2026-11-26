<script setup lang="ts">
import { createCalendarModel, typedCalendar } from "@fragiola/calendar-vue";
import { Sparkles } from "@lucide/vue";
import { onMounted, shallowRef, useTemplateRef } from "vue";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import AllDayEvent from "./all-day-event.vue";
import { planMyWeek, type ToolCall } from "./assistant";
import DayHeader from "./day-header.vue";
import Navigation from "./navigation.vue";
import SlotTime from "./slot-time.vue";
import * as styles from "./styles";
import TimedEvent from "./timed-event.vue";
import Title from "./title.vue";

/** A step the assistant ran, and what the model answered. */
interface Step {
    call: ToolCall;
    outcome: string;
    ok: boolean;
}

// Every change of the calendar is a command with JSON Schemas: `model.get("commands")` is the
// catalogue an AI agent takes as its tool definitions, and `model.dispatch` runs its untrusted
// calls (validated, refused with a reason, never repaired). The assistant here is scripted
// (assistant.ts) so the example runs without a model.
const Calendar = typedCalendar<Types>();
const model = createCalendarModel<Types>({
    version: 1,
    events: teamWeek(),
    calendars: CALENDARS,
    view: { type: "week", anchorDate: day() },
});
const tools = model.get("commands");
const steps = shallowRef<Step[]>([]);
function plan() {
    const done: Step[] = [];
    for (const call of planMyWeek()) {
        // `meta` says who asked: a middleware may decide on it (never read from the input)
        const result = model.dispatch(call, {
            meta: { source: "assistant" },
        });
        done.push({
            call,
            ok: result.ok,
            outcome: result.ok
                ? "ok"
                : `${result.error.code}: ${result.error.message}`,
        });
    }
    steps.value = done;
}

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null | undefined) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}

const scroller = useTemplateRef<{ $el: HTMLElement }>("scroller");
onMounted(() => scrollToMorning(scroller.value?.$el));
</script>

<template>
    <Calendar.Root :model="model" :class="styles.root">
        <div :class="styles.layout">
            <div :class="styles.main">
                <div :class="styles.toolbar">
                    <Title />
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
            </div>
            <aside aria-label="Assistant" :class="styles.panel">
                <button
                    type="button"
                    :class="styles.primary"
                    :disabled="steps.length > 0"
                    @click="plan"
                >
                    <Sparkles aria-hidden="true" :class="styles.icon" />Plan my week
                </button>
                <ol
                    v-if="steps.length > 0"
                    aria-label="Tool calls"
                    :class="styles.steps"
                >
                    <!-- a transcript never reorders: its index is its key -->
                    <li
                        v-for="(step, index) in steps"
                        :key="index"
                        :class="styles.step(step.ok)"
                    >
                        <span :class="styles.stepCommand">{{ step.call.command }}</span>
                        <code :class="styles.code">{{ JSON.stringify(step.call.payload) }}</code>
                        <span :class="styles.outcome">→ {{ step.outcome }}</span>
                    </li>
                </ol>
                <h3 :class="styles.panelHeading">{{ tools.length }} tools, from model.get("commands")</h3>
                <ul aria-label="Tools" :class="styles.tools">
                    <li v-for="tool in tools" :key="tool.name">
                        <details :class="styles.tool">
                            <summary :class="styles.toolName">{{ tool.name }}</summary>
                            <p :class="styles.toolDescription">{{ tool.description }}</p>
                            <pre :class="styles.schema">{{ JSON.stringify(tool.payloadSchema, null, 2) }}</pre>
                        </details>
                    </li>
                </ul>
            </aside>
        </div>
    </Calendar.Root>
</template>
