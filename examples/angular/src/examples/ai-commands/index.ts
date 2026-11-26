import {
    afterNextRender,
    Component,
    type ElementRef,
    signal,
    viewChild,
} from "@angular/core";
import { CALENDAR, createCalendarModel } from "@fragiola/calendar-angular";
import {
    LucideChevronLeft,
    LucideChevronRight,
    LucideSparkles,
} from "@lucide/angular";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { planMyWeek, type ToolCall } from "./assistant";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Title } from "./title";

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
@Component({
    selector: "example-ai-commands",
    imports: [
        CALENDAR,
        DayHeader,
        LucideChevronLeft,
        LucideChevronRight,
        LucideSparkles,
        Title,
    ],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root">
            <div [class]="styles.layout">
                <div [class]="styles.main">
                    <div [class]="styles.toolbar">
                        <h2 aiCommandsTitle [class]="styles.title"></h2>
                        <button calendarToday [class]="styles.button">Today</button>
                        <button calendarPrevious aria-label="Previous week" [class]="styles.iconButton">
                            <svg lucideChevronLeft aria-hidden="true" [class]="styles.flip"></svg>
                        </button>
                        <button calendarNext aria-label="Next week" [class]="styles.iconButton">
                            <svg lucideChevronRight aria-hidden="true" [class]="styles.flip"></svg>
                        </button>
                    </div>
                    <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                        <div calendarColumnHeaders [class]="styles.headers">
                            <ng-template calendarColumnHeadersItem let-date>
                                <div [calendarColumnHeader]="date" [aiCommandsDayHeader]="date" [class]="styles.header"></div>
                            </ng-template>
                        </div>
                        <div calendarAllDayRow [class]="styles.allDayRow">
                            <div aria-hidden="true" [class]="styles.allDayLabel">all-day</div>
                            <ng-template calendarDays let-day>
                                <div [calendarDay]="day" [class]="styles.allDayCell">
                                    <div calendarDayEvents>
                                        <ng-template calendarDayEventsItem let-segment>
                                            <div
                                                [calendarSegment]="segment"
                                                #event="calendarSegment"
                                                [class]="event.state() && styles.segment(event.state()!)"
                                            >
                                                <span [class]="styles.segmentLabel">{{ titleOf(model, segment.occurrenceId, segment.eventId) }}</span>
                                            </div>
                                        </ng-template>
                                    </div>
                                </div>
                            </ng-template>
                        </div>
                        <div calendarScroller #scroller [class]="styles.scroller">
                            <div [class]="styles.body">
                                <ng-template calendarSlotRows let-slot>
                                    <div [calendarSlotRow]="slot" [class]="styles.slotRow">
                                        <div calendarSlotLabel [class]="styles.slotLabel">
                                            @if (slot.time.endsWith(":00")) {
                                    <span [class]="styles.slotTime">{{ hour(slot.time) }}</span>
                                }
                                        </div>
                                        <ng-template calendarSlots let-column>
                                            <div [calendarSlot]="column.date" [class]="styles.slot"></div>
                                        </ng-template>
                                    </div>
                                </ng-template>
                                <div calendarColumns [class]="styles.columns">
                                    <ng-template calendarColumnsItem let-column>
                                        <div [calendarColumn]="column" [class]="styles.column">
                                            <div calendarColumnEvents>
                                                <ng-template calendarColumnEventsItem let-segment>
                                                    <div
                                                        [calendarTimeEvent]="segment"
                                                        #event="calendarTimeEvent"
                                                        [class]="event.state() && styles.event(event.state()!)"
                                                    >
                                                        <span [class]="styles.eventBox">
                                                            <span [class]="styles.eventTitle">{{ titleOf(model, segment.occurrenceId, segment.eventId) }}</span>
                                                            <span [class]="styles.eventTime">{{ timesOf(model, segment.occurrenceId) }}</span>
                                                        </span>
                                                    </div>
                                                </ng-template>
                                            </div>
                                        </div>
                                    </ng-template>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <aside aria-label="Assistant" [class]="styles.panel">
                    <button type="button" [class]="styles.primary" [disabled]="steps().length > 0" (click)="plan()">
                        <svg lucideSparkles aria-hidden="true" [class]="styles.icon"></svg>Plan my week
                    </button>
                    @if (steps().length > 0) {
                        <ol aria-label="Tool calls" [class]="styles.steps">
                            <!-- a transcript never reorders: its index is its key -->
                            @for (step of steps(); track $index) {
                                <li [class]="styles.step(step.ok)">
                                    <span [class]="styles.stepCommand">{{ step.call.command }}</span>
                                    <code [class]="styles.code">{{ json(step.call.payload) }}</code>
                                    <span [class]="styles.outcome">→ {{ step.outcome }}</span>
                                </li>
                            }
                        </ol>
                    }
                    <h3 [class]="styles.panelHeading">{{ tools.length }} tools, from model.get("commands")</h3>
                    <ul aria-label="Tools" [class]="styles.tools">
                        @for (tool of tools; track tool.name) {
                            <li>
                                <details [class]="styles.tool">
                                    <summary [class]="styles.toolName">{{ tool.name }}</summary>
                                    <p [class]="styles.toolDescription">{{ tool.description }}</p>
                                    <pre [class]="styles.schema">{{ json(tool.payloadSchema, 2) }}</pre>
                                </details>
                            </li>
                        }
                    </ul>
                </aside>
            </div>
        </div>
    `,
})
export default class AiCommands {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types>({
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        view: { type: "week", anchorDate: day() },
    });
    protected readonly tools = this.model.get("commands");
    protected readonly steps = signal<Step[]>([]);
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement));
    }

    protected plan() {
        const done: Step[] = [];
        for (const call of planMyWeek()) {
            // `meta` says who asked: a middleware may decide on it (never read from the input)
            const result = this.model.dispatch(call, {
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
        this.steps.set(done);
    }

    protected json(value: unknown, indent?: number): string {
        return JSON.stringify(value, null, indent);
    }

    /** An hour's label, `9 AM` in the calendar's locale. */
    protected hour(time: string): string {
        return text(
            this.model.get("slot-label-by", {
                time,
                format: { hour: "numeric" },
            }) ?? [],
        );
    }
}

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement) {
    const eight = element.querySelector<HTMLElement>('[data-time="08:00"]');
    if (eight) element.scrollTop = eight.offsetTop - 8;
}
