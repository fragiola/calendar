// The fixtures' calendar: every primitive of the view it shows, unstyled (fixture.css gives plain
// boxes of known sizes), so Playwright can point at days, slots and events. The clock is injected
// (`now`), the zone and the locale are the fixture's: no date depends on the machine.
//
// Each fixture page reads its options from the URL: `?view=month|week|day|days|list`,
// `&date=YYYY-MM-DD` (the anchor), `&dir=rtl`. An event shows its title, from the model.
import {
    Calendar,
    type CalendarEngineEvent,
    type CalendarEventJson,
    type CalendarFeatures,
    type CalendarSettingsJson,
    useCalendar,
    useCalendarView,
    type ViewType,
} from "@fragiola/calendar-react";
import { BusinessHours } from "@fragiola/calendar-react/constraints";
import { DragPreview } from "@fragiola/calendar-react/drag-and-drop";
import { NowIndicator } from "@fragiola/calendar-react/now-indicator";
import { ResizeHandle } from "@fragiola/calendar-react/resize";
import { Selection } from "@fragiola/calendar-react/selection";
import { type ReactNode, useState } from "react";

/** The fixtures' "now": Thursday 2026-11-26, 12:00 in New York. */
export const NOW = Date.parse("2026-11-26T12:00:00-05:00");

/** The display zone of the fixtures (the browser's, `timezoneId`, is the same). */
export const ZONE = "America/New_York";

/** The fixtures' settings: New York, Sunday first, en-US. */
export const SETTINGS: CalendarSettingsJson = {
    timeZone: ZONE,
    locale: "en-US",
    firstDayOfWeek: 0,
};

const VIEWS: readonly ViewType[] = ["month", "week", "day", "days", "list"];

/** The fixture's options from its URL. */
export function urlOptions(): {
    view: ViewType;
    date: string;
    rtl: boolean;
} {
    const query = new URLSearchParams(window.location.search);
    const view = query.get("view") as ViewType | null;
    return {
        view: view && VIEWS.includes(view) ? view : "month",
        date: query.get("date") ?? "2026-11-26",
        rtl: query.get("dir") === "rtl",
    };
}

/** A timed event in New York (`HH:mm` on a day). */
export function timed(
    id: string,
    date: string,
    start: string,
    end: string,
    extra: Partial<CalendarEventJson> = {},
): CalendarEventJson {
    return {
        id,
        title: id,
        start: `${date}T${start}:00-05:00`,
        end: `${date}T${end}:00-05:00`,
        allDay: false,
        ...extra,
    };
}

/** An all-day event (end exclusive). */
export function allDay(
    id: string,
    start: string,
    end: string,
    extra: Partial<CalendarEventJson> = {},
): CalendarEventJson {
    return { id, title: id, start, end, allDay: true, ...extra };
}

/** An event's title, as the model holds it (an occurrence may have its own). */
function Title(props: { occurrenceId: string; eventId: string }) {
    const { model } = useCalendar();
    const occurrence = model.get("occurrence-by", { id: props.occurrenceId });
    return (
        <span data-testid="title">
            {occurrence?.title ??
                model.get("event-by", { id: props.eventId })?.title}
        </span>
    );
}

/** What the features add to the parts: rendered only when the fixture installs them. */
export interface FixtureParts {
    selection?: boolean;
    drag?: boolean;
    resize?: boolean;
    now?: boolean;
    businessHours?: boolean;
}

/** Counts each call of a row's or column's children function (the stress fixture's counters). */
export type RenderCount = (key: string) => void;

/** The navigation and view buttons. */
export function Toolbar() {
    return (
        <div data-testid="toolbar">
            <Calendar.Previous>Previous</Calendar.Previous>
            <Calendar.Today>Today</Calendar.Today>
            <Calendar.Next>Next</Calendar.Next>
            <Calendar.ViewButton view="month">Month</Calendar.ViewButton>
            <Calendar.ViewButton view="week">Week</Calendar.ViewButton>
            <Calendar.ViewButton view="day">Day</Calendar.ViewButton>
            <Calendar.ViewButton view="list">List</Calendar.ViewButton>
        </div>
    );
}

function DayHeader(props: { date: string }) {
    return (
        <Calendar.ColumnHeader date={props.date}>
            {props.date}
        </Calendar.ColumnHeader>
    );
}

function Month(props: {
    parts: FixtureParts;
    count?: RenderCount | undefined;
}) {
    const { parts, count } = props;
    return (
        <Calendar.DayGrid aria-label="Month">
            <Calendar.ColumnHeaders>
                {(date) => <DayHeader date={date} />}
            </Calendar.ColumnHeaders>
            <Calendar.Weeks>
                {(week) => {
                    count?.(`week ${week.id}`);
                    return (
                        <Calendar.Week week={week}>
                            <Calendar.Days>
                                {(day) => (
                                    <Calendar.Day day={day}>
                                        <span aria-hidden="true">
                                            {day.date.slice(8)}
                                        </span>
                                        <Calendar.DayEvents>
                                            {(segment) => (
                                                <Calendar.Segment
                                                    segment={segment}
                                                    aria-label={
                                                        segment.occurrenceId
                                                    }
                                                >
                                                    <Title {...segment} />
                                                    {parts.resize ? (
                                                        <ResizeHandle edge="end" />
                                                    ) : null}
                                                </Calendar.Segment>
                                            )}
                                        </Calendar.DayEvents>
                                        <Calendar.More>
                                            {(state) =>
                                                `+${state.hiddenCount} more`
                                            }
                                        </Calendar.More>
                                    </Calendar.Day>
                                )}
                            </Calendar.Days>
                            {parts.selection ? <Selection /> : null}
                            {parts.drag || parts.resize ? (
                                <DragPreview />
                            ) : null}
                        </Calendar.Week>
                    );
                }}
            </Calendar.Weeks>
        </Calendar.DayGrid>
    );
}

function TimeGrid(props: {
    parts: FixtureParts;
    count?: RenderCount | undefined;
}) {
    const { parts, count } = props;
    return (
        <Calendar.TimeGrid aria-label="Week">
            <Calendar.ColumnHeaders>
                {(date) => <DayHeader date={date} />}
            </Calendar.ColumnHeaders>
            <Calendar.AllDayRow>
                {(day) => (
                    <Calendar.Day day={day}>
                        <Calendar.DayEvents>
                            {(segment) => (
                                <Calendar.Segment
                                    segment={segment}
                                    aria-label={segment.occurrenceId}
                                >
                                    <Title {...segment} />
                                </Calendar.Segment>
                            )}
                        </Calendar.DayEvents>
                    </Calendar.Day>
                )}
            </Calendar.AllDayRow>
            <Calendar.Scroller data-testid="scroller">
                <div data-testid="body">
                    <Calendar.SlotRows>
                        {(slot) => (
                            <Calendar.SlotRow slot={slot}>
                                <Calendar.SlotLabel>
                                    {slot.time}
                                </Calendar.SlotLabel>
                                <Calendar.Slots>
                                    {(column) => (
                                        <Calendar.Slot
                                            date={column.date}
                                            aria-label={`${column.date} ${slot.time}`}
                                        />
                                    )}
                                </Calendar.Slots>
                            </Calendar.SlotRow>
                        )}
                    </Calendar.SlotRows>
                    <Calendar.Columns>
                        {(column) => {
                            count?.(`column ${column.date}`);
                            return (
                                <Calendar.Column column={column}>
                                    {parts.businessHours ? (
                                        <BusinessHours />
                                    ) : null}
                                    <Calendar.ColumnEvents>
                                        {(segment) => (
                                            <Calendar.TimeEvent
                                                segment={segment}
                                                aria-label={
                                                    segment.occurrenceId
                                                }
                                            >
                                                <Title {...segment} />
                                                {parts.resize ? (
                                                    <ResizeHandle edge="end" />
                                                ) : null}
                                            </Calendar.TimeEvent>
                                        )}
                                    </Calendar.ColumnEvents>
                                    {parts.selection ? <Selection /> : null}
                                    {parts.drag || parts.resize ? (
                                        <DragPreview />
                                    ) : null}
                                    {parts.now && column.today ? (
                                        <NowIndicator />
                                    ) : null}
                                </Calendar.Column>
                            );
                        }}
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    );
}

function ListView() {
    return (
        <Calendar.List>
            <Calendar.ListDays>
                {(day) => (
                    <section key={day.date}>
                        <h2>{day.date}</h2>
                        <Calendar.ListDay day={day}>
                            {(item) => (
                                <Calendar.ListEvent item={item}>
                                    <Title {...item} />
                                </Calendar.ListEvent>
                            )}
                        </Calendar.ListDay>
                    </section>
                )}
            </Calendar.ListDays>
        </Calendar.List>
    );
}

/** The view the root shows (the view buttons change it). */
export function View(props: {
    parts: FixtureParts;
    count?: RenderCount | undefined;
}) {
    const { type } = useCalendarView();
    if (type === "month") return <Month {...props} />;
    if (type === "list") return <ListView />;
    return <TimeGrid {...props} />;
}

/** The log of the engine's events, newest last: what a fixture's spec reads. */
export function useEventLog() {
    const [log, setLog] = useState<string[]>([]);
    const push = (event: CalendarEngineEvent) => {
        if (event.type === "announce") return;
        setLog((current) => [...current, logLine(event)]);
    };
    return { log, push };
}

function logLine(event: CalendarEngineEvent): string {
    switch (event.type) {
        case "event-click":
            return `event-click ${event.occurrenceId}`;
        case "date-click":
            return `date-click ${event.date}${event.time ? ` ${event.time}` : ""}`;
        case "more-click":
            return `more-click ${event.date} ${event.occurrenceIds.join(",")}`;
        case "select":
            return `select ${event.range.start} ${event.range.end}`;
        case "drop":
            return `drop ${event.kind} ${event.occurrenceId} ${event.start} ${event.end}`;
        case "external-drop":
            return `external-drop ${event.eventId ?? "-"}`;
        default:
            return event.type;
    }
}

/** The log as a list (`data-testid="log"`). */
export function Log(props: { log: readonly string[] }) {
    return (
        <ol data-testid="log" aria-label="Log">
            {props.log.map((line, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a log only grows
                <li key={index}>{line}</li>
            ))}
        </ol>
    );
}

export interface FixtureProps<F extends CalendarFeatures> {
    events: CalendarEventJson[];
    settings?: CalendarSettingsJson;
    features?: F;
    parts?: FixtureParts;
    count?: RenderCount;
    onEvent?: (event: CalendarEngineEvent) => void;
    /** below the calendar: a log, a task list */
    children?: ReactNode;
}

/** The callbacks of the features installed (another feature's callback warns). */
function featureCallbacks(
    features: CalendarFeatures | undefined,
    on: ((event: CalendarEngineEvent) => void) | undefined,
): Record<string, unknown> {
    const names = new Set((features ?? []).map((feature) => feature.name));
    if (!on) return {};
    return {
        ...(names.has("selection") ? { onSelect: on } : {}),
        ...(names.has("drag-and-drop") || names.has("resize")
            ? { onEventDrop: on }
            : {}),
        ...(names.has("external-drop") ? { onExternalDrop: on } : {}),
    };
}

/** A fixture page's calendar, from its URL's options. */
export function Fixture<const F extends CalendarFeatures = readonly []>(
    props: FixtureProps<F>,
) {
    const [options] = useState(urlOptions);
    const on = props.onEvent;
    return (
        <div dir={options.rtl ? "rtl" : "ltr"}>
            <Calendar.Root
                aria-label="Calendar"
                defaultEvents={props.events}
                settings={{ ...SETTINGS, ...props.settings }}
                defaultView={options.view}
                defaultDate={options.date}
                features={props.features}
                now={() => NOW}
                onEventClick={on}
                onDateClick={on}
                onMoreClick={on}
                onAnnounce={on}
                {...featureCallbacks(props.features, on)}
            >
                <Toolbar />
                <View parts={props.parts ?? {}} count={props.count} />
            </Calendar.Root>
            {props.children}
        </div>
    );
}
