# Survey: the references, the feature map and the edge cases

The planning survey of Epic #6, kept as **behaviour notes only**. The three references under
`../references/` (FullCalendar v7.1.5, Schedule-X v4.9.2, SVAR React Calendar v2.7.1, all MIT) are
read-only: their features, behaviour, edge cases and tests are studied, and **no code is copied or
ported** from them (`AGENTS.md`, Provenance). Paths below point to where a behaviour or a test can
be read, not to code to reuse.

## What each reference does

### FullCalendar (`../references/fullcalendar`; the premium scheduler is not in the checkout)

- **Views:** day grid (day, week, month; a fixed six-week month; dates outside the month shown or
  not), time grid (day, week, with an all-day row), list, multi-month year. A view's span can be a
  duration or an explicit range; `validRange` limits navigation; `hiddenDays`; a configurable step.
- **Events:** id, link group (`groupId`: linked events move together), title, url, start/end,
  `allDay`, free data, a display mode (block, list item, background, inverse background, none),
  edit flags (`editable`, `startEditable`, `durationEditable`), `constraint` / `overlap` / `allow`.
  Simple recurrence (days of week, start and end times, recurrence bounds) and RRULE through a
  plugin; occurrences expanded per visible range.
- **Ranges:** one range generator per view: the valid range, the range rendered, the active range,
  the current range (the month vs the six weeks shown), the slot bounds.
- **Time zones:** local, UTC and named zones; named zones through a Temporal polyfill (a peer).
- **Time-grid overlap:** overlapping events are grouped, split into equal columns, and each one
  widens to the right until the first column holding an overlapping event. Default order: start,
  then longer first, then all-day, then title. Minimum event height 15 px; "short" events under
  30 px.
- **Event sources:** arrays, functions or JSON feeds; lazy fetching refetches only outside the
  range a source already fetched.
- **"+N more":** a maximum number of events or rows per day, a popover listing the rest.
- **Gestures:** mouse and touch (not Pointer Events); emulated mouse events ignored for 500 ms after
  touch; a 1 s long press on touch; a 5 px drag threshold; autoscroll; hit-testing on cached
  offsets.
- **API shape:** change view, previous, next, today, go to a date, select / unselect, add and find
  events, add event sources, refetch, scroll to a time; callbacks for dates shown, event click,
  select, date click, event drop and resize (with a revert), external drop, event receive / leave.
- **Accessibility (since 7.1.2):** grids are tables (not `grid`), each day's events a
  `role="list"`, dates as visually hidden text.

### Schedule-X (`../references/schedule-x`; `@sx-premium/*` is closed)

- **Views:** day, week (n days), month grid, month agenda, week agenda, list, year grid; each view
  defines its range and its backward / forward step.
- **Events:** id, start, end, title, people, location, description, calendar id, resource id,
  per-event drag and resize switches, foreign fields (`rrule`, `exdate`). Timed values are zoned
  date-times, all-day values plain dates. **The all-day end is inclusive.** Background events (they
  can recur).
- **Calendars (categories):** a colour name, a label, light and dark colours, a read-only flag.
- **State:** a global store of signals that plugins change directly; Temporal through a polyfill
  peer; UTC by default; dates compared as strings (its own design notes call it fragile).
- **Time grid:** 100 points per hour; day boundaries in whole hours, including "hybrid" days that
  cross midnight; a grid step (15 min by default, 5–60).
- **Pointer to time:** the click's offset over the column height times the points, not snapped.
- **Drag (its old MIT specs):** vertical snap to the interval, horizontal by whole day widths, RTL
  inverted, clamped to the day boundaries and the visible range; a veto callback before the update;
  resize changes the end only.
- **Overlap:** clusters of overlapping events, greedy interval colouring; an option stretches an
  event to the right edge; zero-minute events count as 30 min. The all-day row packs with blocked
  cells.
- **Recurrence:** FREQ daily, weekly, monthly, yearly, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY,
  WKST; occurrences are clones with the same id, regenerated per range; dragging an occurrence
  shifts the whole series; only `exdate` for single exceptions.
- **Plugins and callbacks:** before / on render, range update, time-zone change, day-boundaries
  change, destroy; event click, before / on event update, range update, fetch events for a range,
  date click, date-time click, "+N events" click, mouse down on a date-time.
- **Adapters:** framework components mounted into slots of its own tree (portals).

### SVAR React Calendar (`../references/svar-react-calendar`; PRO is commercial)

- The checkout is only the React rendering layer (the store and state libraries are not in it), no
  tests, no changelog.
- **Free features:** day, week and month; move and resize; drag-to-create in time grids; external
  drop (an event projection); an editor, a calendars panel, a context menu, a toolbar; iCal; a REST
  provider. PRO: agenda, year, resources, timeline, editable recurrence, time zones, dynamic
  loading, undo / redo, export.
- **Events:** id, text, start, end, all-day, rrule, duration, calendar id, units; an occurrence has
  an encoded id that decodes to its series; editing a recurrence takes a mode (series, single, …).
- **Action router:** each action can be intercepted before the store (to rewrite or veto it),
  observed after it, and forwarded to a back-end. Actions: add, update, move, delete, select an
  event; navigate to a date and view; navigate in time; filter events. Close to a command bus with
  middleware and events.
- **View model:** sections in a mode (boxes, bars, grid, list, year) with headers, a drag and a
  drag-create state, a now line, an overlap mode (split or overlap) and an overflow mode ("+N more"
  or expand); event boxes placed in **0–100 % space** (x, y, width, height, lane, total lanes), and
  positions mapped back to dates with a snap. A layout in percent space suits a headless engine.
- **Gestures:** mouse only; 3 px to move, 5 px to create; resize on the bottom 20 px of boxes
  taller than 40 px; month moves snap by a day, keeping the duration.

## Feature map

**core**: the v1 main entry. **feature**: v1, opt-in through the feature registry
(`../guidelines/architecture/features.md`), each on its own subpath. **later**: not v1.

| capability | class | notes |
| --- | --- | --- |
| JSON document v1: events, calendars (categories), settings; validation; `calendar-json` round trip | core | explicit ids, an injectable `createId` |
| dates and times: all-day dates and offset date-times as JSON strings, exclusive ends, IANA time zones through `Intl` (no Temporal polyfill, zero dependencies), DST gaps and overlaps | core | the hardest part; FullCalendar's date and time-zone tests are the behaviour reference |
| visible range and navigation: go to, previous, next, today, change of view; first day of the week, hidden days, a valid range | core | each view's range derived, like FullCalendar's ranges |
| views: month (a day grid of week rows), time grid (day, week, n days, with an all-day row), list | core | view types of the model, not plugins |
| layout: day-grid lanes with multi-day segments split per week, "+N more" counts; time-grid overlap columns (clusters, column assignment, widening) | core | output in fractions of a column (SVAR's percent space); the engine applies geometry |
| event commands: add, update, move, resize, remove, set data; edit flags per event, calendar and settings, enforced in the commands | core | `can` / `check` answer drags |
| locale data through `Intl` (headers and slot labels as parts, not text), ISO and locale week numbers, RTL | core | no translations shipped |
| keyboard navigation over days and slots (roving focus), the accessible structure | core | a calendar without arrows is not usable: not a feature |
| range selection (pointer drag, keyboard, a click on a day or a slot): `selection()` | feature | drag-to-create is selection plus the app's `event.add` |
| move by drag (pointer and keyboard), across days, all-day ↔ timed: `dragAndDrop()` | feature | Pointer Events, snapped to slots, autoscroll, touch long press |
| resize the start or the end (pointer and keyboard): `resize()` | feature | |
| recurrence (an RRULE subset: FREQ, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH, WKST; EXDATE; edit this, this and following, all): `recurrence()` | feature | own expansion, no `rrule` dependency |
| now indicator (from an injected clock, moving across midnight): `nowIndicator()` | feature | |
| business hours and constraints (allowed ranges, overlap rules for drops): `constraints()` | feature | |
| external drop (foreign content, and app-driven drags from other libraries): `externalDrop()` | feature | native HTML5 drag only for foreign content |
| event sources and lazy fetching per range: `eventSources()` | feature (state) | Data Grid's state-feature pattern: the app fetches; a server example |

### Later (not v1)

- Background events (`display: background`).
- Day boundaries crossing midnight ("hybrid" days) and slot ranges beyond 24 h.
- Year and multi-month views.
- Resources and timeline / scheduler views (the premium tier of every reference; an Epic of its
  own).
- Linked events (`groupId`), virtualization of long ranges, iCal import and export (an app
  recipe), print layouts.

### Never in the packages

An event editor or modal, date and time pickers, context menus, tooltips, a calendars panel, the
"+N more" popover, themes, undo / redo, persistence, translations: app policy, shown in the
examples as copyable code (built with Fragiola UI in React, and the shared recipes in Vue and
Angular, as Tree does).

**The references' styled UI that becomes headless primitives:** the toolbar (a title as `Intl`
parts, previous / next / today, a view switcher), day headers, day cells, week-number cells,
time-axis slot labels, event chips, resize handles, the selection and drag previews, the "+N more"
trigger, the now indicator, business-hours fills, list day headers.

## Edge cases to test

Each is a behaviour the calendar must get right, written as a hand-made test case (the reference
named is where the behaviour, or its bug, can be read).

**Dates and time zones**

- Exclusive ends for all-day and timed events (FullCalendar); an inclusive all-day end is a known
  source of off-by-one bugs (Schedule-X).
- `nextDayThreshold`: a timed event ending shortly after midnight does not show on the next day.
- A DST gap: a skipped wall time moves forward to the next valid time (FullCalendar's date tests,
  its time-zone tests).
- A DST overlap: a repeated wall time takes the earlier offset.
- Days of 23 and 25 hours in the time grid; a grid that assumes 24 uniform hours skews (Schedule-X).
- A day header off by one when DST changes at midnight (FullCalendar #7633).
- Time slots that ignore DST (FullCalendar #7620, a timeline bug).
- "Today" not updating after midnight (FullCalendar #3783): a refresh at the next midnight of the
  display zone.
- A range end at 23:59 off by one, zero-duration comparisons (Schedule-X #1339).
- Week numbers: ISO only when the week starts on Monday, a `firstDayOfWeek = 0` bug (Schedule-X,
  fixed in 4.9.2): every first day of the week, around year boundaries.

**Layout**

- Multi-week events sliced per week row, with "+N more" hiding segments (FullCalendar's
  more-link tests).
- Zero-length events in the overlap layout (Schedule-X counts them as 30 min; the calendar uses
  `eventMinDuration`).
- A slot range past 24 h hid the now indicator (FullCalendar #6394); business hours past midnight
  (FullCalendar #7934).
- Now indicator in today's column after midnight in a day crossing midnight (Schedule-X).

**Gestures and commands**

- All-day ↔ timed drag: `allDay` flips, the duration is dropped unless `allDayMaintainDuration`,
  the drop time is taken literally (FullCalendar #7533, its time-grid drag tests).
- RTL drag (FullCalendar; Schedule-X inverts the horizontal axis).
- The drag preview must ask the same constraints as the drop (FullCalendar, fixed in 7.1.5).
- A drag cancelled when the element leaves the DOM during a re-render (SVAR).
- A zero-duration drop deleting the end (SVAR): refused instead (refuse over repair).
- Dragging an occurrence of a recurring event: the edit scope decides (Schedule-X shifts the
  series; the calendar defaults to `this`).
- Saving a series through an occurrence's id (SVAR's encoded ids): occurrence ids are
  `<eventId>@<original start>`.

**Lifecycles**

- Timers leaking under React Strict Mode and Activity (FullCalendar): every timer goes through the
  engine's host and is cleared on destroy.
- A new but equal `validRange` on every render causing an infinite loop (FullCalendar #7069):
  settings compare by value.
- The first day of the week read only at creation (SVAR): a settings change re-derives the range.
- Fetching events without expanding the recurrence (Schedule-X #1330): event sources receive
  documents, expansion is the model's.
- Hard-coded formatters ignoring the locale (SVAR): all formatting is `Intl` parts.

## Where to read the references' tests

FullCalendar's `packages/vanilla-tests/src/`: `constraints`, `date-select`, `event-drag`,
`event-resize`, `more-link`, `now-indicator`, `time-zones`, `datelib`, `visible-range`,
`week-numbers`, `business-hours`. Schedule-X: 181 spec files under `packages/*/src/**/__test__`,
its recurrence specs, and the old MIT drag specs (`git show 589d3cf4^:packages/drag-and-drop/src/…`,
`custom-day-boundaries.spec.ts`, `default-day-boundaries.spec.ts`). SVAR has no tests.

## Ecosystem gaps, and how the Epic closed them

| gap | decision |
| --- | --- |
| dates and time zones with zero dependencies | `Intl` only; `YYYY-MM-DD` and RFC 3339 with an offset in the document (D4) |
| a dependency on `@fragiola/primitives` | none; a structurally identical `PlainDate` (D5) |
| an accessibility pattern for an event calendar | an APG grid with roving focus over dates, each cell's events a list (D12) |
| the feature registry's form | Data Grid's where it and Tree drift (D2) |
| drag implementation | the core's own Pointer Events machinery, not `@fragiola/dnd` (D14) |
| recurrence | an in-package RRULE subset, occurrence ids, edit scopes as command options (D15) |
| clock injection | `now` beside `createId` (D16) |
| attributes | `data-calendar-part`, no path; `data-date` / `data-time` positions (D17) |
