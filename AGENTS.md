# Fragiola Calendar

A **headless**, accessible event calendar: month, week, day, n-day and list views; selecting a
range, moving and resizing events by pointer and keyboard; recurring events; time zones. It ships
behaviour, accessibility and composable primitives. It ships **no CSS, no icons, no rendered
menus, no popovers, no editor and no text**. Styling belongs 100% to the consuming developer; the
package never assumes Tailwind, shadcn or anything else.

Its architecture is Fragiola's (`../guidelines`), with **Dockable (`../dockable`) as the
reference implementation**, Tree (`../tree`) as the closest library (core + React/Vue/Angular, a
feature registry from the first feature) and Data Grid (`../data-grid`) for the feature registry's
details (where Data Grid and Tree drift, the calendar follows Data Grid,
`../guidelines/decisions.md#feature-registry`). A framework-free core holds the document, the date
and time-zone engine, the model and its commands, the views and their layout, the features and the
engine; each framework has a thin adapter, so **every piece of logic that isn't rendering lives in
the core**.

| package | name | contains | depends on |
|---|---|---|---|
| `packages/core` | `@fragiola/calendar` | the calendar document (v1) and its JSON Schemas, the date and time-zone engine (`Intl` only), the model and its command bus (commands with JSON Schemas, `get`/`is` queries, middleware, events), the views, ranges and layout, the feature registry and every opt-in feature on its own subpath (D2), and the engine (keyboard, gestures, measurement). Today: the date and time-zone engine (`time/`, `time-zone/`, `locale/`, Issue #2) and the model (`schema/`, `document/`, `state/`, `commands/`, `view/`, `layout/`, `attributes/`, `features/`, `model/`, `format/`, Issue #3; formatting keys, Issue #4) and the model features `recurrence/`, `constraints/`, `event-sources/` (Issue #4), the engine (`engine/`) and the interactive features `selection/`, `drag-and-drop/`, `resize/`, `external-drop/`, `now-indicator/` with their shared `drop-target/` (Issue #5), each feature on its subpath | DOM only, zero runtime deps |
| `packages/react` | `@fragiola/calendar-react` | the `Calendar.*` primitives and hooks over the core, every feature's entry mirrored with its parts, and the core re-exported (Issue #7) | the core (`workspace:*`, published as the exact version); peer `react`, `react-dom` (^19) |
| `packages/vue` | `@fragiola/calendar-vue` | the same `Calendar.*` primitives and composables in Vue idioms, every feature's entry mirrored, `typedCalendar<T, F>()`, and the core re-exported (Issue #11) | the core (`workspace:*`, published as the exact version); peer `vue` (^3.5) |
| `packages/angular` | `@fragiola/calendar-angular` | the same primitives as Angular directives (Angular Epic) | the core; peer `@angular/core` |
| `site` | `site`, private | the site export (fragiola.com/calendar, contract v1.7): `project.json`, `examples.json`, `export.ts`, `contract.ts`, `dev.ts`, `dev-proxy.ts`, `sources.ts`, the docs (`site/docs`), and the repository's script tests (Issue #9) | |

`packages/core`, `packages/react`, `packages/vue`, `apps/playground`, `examples/shared`,
`examples/react`, `examples/vue` and `site` exist; the Angular adapter and examples come with their
Epic.

## Non-negotiable rules

1. **Core + adapters.** All logic that is not rendering lives in `packages/core`, which never
   imports a framework, has **zero runtime dependencies**, and never touches global `document`,
   `window`, `requestAnimationFrame`, `ResizeObserver`, `crypto` or `setTimeout`: DOM access goes
   through the root element's `ownerDocument`/`defaultView` or the engine's injected host, ids
   come from an injectable `createId`, "now" from an injectable clock (D16). The model loads in
   plain Node. `packages/core/tests/guard.test.ts` enforces it (D21).
2. **One model API.** State is plain, frozen, JSON-shaped data; every change is a command
   (`<entity>.<verb>`) through the bus, which never throws on bad input and returns a typed
   `CommandResult`; every question is a key on `run`, `can`, `check`, `get`, `is` (D8, D20;
   `../guidelines/architecture/model-api.md`).
3. **Headless.** No CSS, no class names, no text, no `aria-label` of the library's own, no dates
   rendered as text by a primitive: formatting is data (`Intl` parts). State is `data-*` (present
   or absent) and ARIA only (D17, D19).
4. **Structural style only**, written by the core in one file (`src/engine/structural-style.ts`);
   time-grid positions are layout fractions the adapters map to percentages, never pixels from the
   engine through a framework render (D18).
5. **Features are opt-in subpath entries** of a feature registry (`../guidelines/architecture/features.md`):
   the main entry never imports one, `scripts/check-features.ts` (run by `pnpm build`) fails when
   it does (D2).
6. **Dates are exact.** All-day dates are `YYYY-MM-DD`, timed values RFC 3339 with an offset; ends
   are exclusive; days are never assumed to last 24 hours; moves by days keep the wall clock in the
   event's zone (D4).
7. **Nonsense is refused, never repaired** (`invalid_payload`, `refused` with a reason); edit
   rules live in the commands, and `can`/`check` answer the same (D9).
8. **App policy stays in the app**: no event editor or modal, date or time pickers, context menus,
   tooltips, calendars panel, "+N more" popover, themes, undo/redo, persistence or translations
   in the packages; the examples show them as copyable code.
9. **Nothing is copied from the references** (Provenance): every algorithm is written fresh from
   the behaviour described and tested.
10. **Every rule a reviewer would otherwise remember is a test** (guard tests, schema/type
    equality, layout check, CI workflow guard, bundle guard).

## Decisions (D1–D23)

Taken while planning Epic #6 (fragiola/calendar#6); binding for every Epic.

- **D1 Packages.** `@fragiola/calendar` (core), then `@fragiola/calendar-react`, `-vue`, `-angular` in later Epics, all at `0.0.0` in the repo, each adapter re-exporting the core (`export *`), depending on it with `workspace:*` (published as the exact version). Slug `calendar`, title "Calendar", dev port **5192**. The adapters' namespace is `Calendar` (`Calendar.Root`, ...); an app that also uses `@fragiola/primitives`' date-picker `Calendar` aliases one of them (documented on the installation page).
- **D2 Feature registry from the first feature** (`architecture/features.md`), following data-grid where data-grid and tree drift. Core: the document, calendars, settings, the date engine, navigation and views, layout, the event commands with their rules, keyboard navigation over dates and events, measurement. Features, each `@fragiola/calendar/<subpath>` → factory, mirrored in each adapter that has code of its own for it:
  `selection()` `/selection` (select a date or time range by pointer and keyboard; drag-to-create is selection plus the app's `event.add`), `dragAndDrop()` `/drag-and-drop` (move events by pointer and keyboard, across days and between the all-day row and the time grid), `resize()` `/resize` (change an event's start or end), `recurrence()` `/recurrence` (RRULE subset, EXDATE, occurrences, edit scopes), `nowIndicator()` `/now-indicator` (the current time's position, updated by the engine's clock), `constraints()` `/constraints` (business hours and allowed ranges, overlap rules that refuse commands), `externalDrop()` `/external-drop` (requires `dragAndDrop`; receives drags from outside the calendar), `eventSources()` `/event-sources` (a state feature: the ranges to fetch, loading state per source; no network code) with the in-memory derivation `/local` only if needed by data-grid's pattern (decide while implementing). Bundle guard `scripts/check-features.ts` in `pnpm build` with a planted-import test.
- **D3 Document.** `{ version: 1, events: CalendarEvent[], calendars: CalendarInfo[], settings }`, JSON-shaped, frozen, validated by its JSON Schema (`CalendarValidationError` with `issues` and JSON paths, `validateCalendar(json)`), `model.get("calendar-json")` round-trips; ids explicit, generated at load with an injectable `createId` when missing (no global `crypto`).
  - An event: `id`, `title` (model data no primitive renders), `start`, `end`, `allDay` (boolean), `timeZone?` (IANA, the event's home zone), `calendarId?`, `data` (narrowed by the `Types` registry on `kind?`), flags (`editable`, `startEditable`, `durationEditable`, `deletable`), `recurrence?` only with `recurrence()`.
  - A calendar (category): `id`, `title`, `data`, flags (`editable`, `visible`).
  - Settings: `timeZone` (display zone, IANA or `"local"`), `locale` (BCP 47), `firstDayOfWeek` (0–6), `hiddenDays`, `weekNumbers` (`"iso" | "locale"`), `slotDuration` (minutes), `slotMinTime` / `slotMaxTime` (within 00:00–24:00), `snapDuration`, `validRange?`, `dayMaxEvents` (`number | "auto" | null`), `nextDayThreshold`, `defaultTimedDuration`, `defaultAllDayDuration`, `direction` is not a setting (the adapters read it from the DOM, D18).
  - A field of a feature that is not installed is a validation issue, never dropped silently.
- **D4 Dates and times (ecosystem gap 1).** Zero runtime dependencies, no Temporal polyfill, `Intl` only.
  - In the document, **an all-day date is `YYYY-MM-DD`** and **a timed value is an RFC 3339 date-time with its offset** (`2026-11-26T09:30:00-03:00`): an instant, unambiguous, as a server or an AI writes it. An event's `timeZone` (optional) is its home zone for recurrence expansion and wall-clock moves; without it the display zone is used.
  - **Ends are exclusive** for all-day and timed events (FullCalendar's rule; Schedule-X's inclusive all-day end is a known source of off-by-one bugs). `nextDayThreshold` decides when a timed end shortly after midnight shows on the next day.
  - Internally the core works on **epoch milliseconds plus wall-clock fields per zone**: a `time-zone` domain computes a zone's offset at an instant with `Intl.DateTimeFormat#formatToParts` (cached per zone and hour), converts wall clock → instant with `"compatible"` disambiguation (a skipped wall time moves forward past the gap; a repeated one takes the earlier offset), and never assumes a day has 24 hours.
  - **Moves keep wall-clock time across DST**: moving by whole days is a calendar delta in the event's zone (09:00 stays 09:00 across a DST change); moving by a time delta is an instant delta. Durations of timed events are instant durations.
  - `Intl` is not DOM: the model may use it in Node. Formatting is exposed as data (`get("title-parts")`, `get("day-header-by")`, slot labels as `Intl.DateTimeFormat` parts), never as text in a primitive.
  - The tests run the DST cases of `America/Sao_Paulo` (historic DST), `America/New_York`, `Europe/London`, `Australia/Lord_Howe` (30-minute DST), `Pacific/Apia` (a skipped day) and `UTC`, with `TZ` forced in Vitest so results do not depend on the machine.
  - *Implementation notes (Issue #2).* `src/time/` holds `PlainDate`, `PlainTime` (`{ hour, minute }`, `24:00` allowed as a day's end), `Instant` (branded epoch ms), `ZonedDateTimeFields` and the strict parsers (`parsePlainDate`, `parsePlainTime`, `parseDateTime`: `ValidationResult` with JSON-pointer issues, never a throw) and printers; dates are epoch days on the proleptic Gregorian calendar with integer math (no `Date`: the guard refuses `new Date`, `Date()`, `Date.parse` and local-time getters in `src/`). `src/time-zone/` reads offsets from `formatToParts` cached per zone and UTC hour, except an hour holding a transition (Lord Howe's at :30), read to the second; wall clock → instant tries the offsets a day before and after, so Apia's 24-hour jump resolves; `startOfDay` is the transition instant when midnight is skipped, and a skipped day lasts 0 minutes (`minutesInDay`). `src/locale/` reads `Intl.Locale#getWeekInfo` / `weekInfo`; Vitest runs the core twice (`core (TZ=UTC)`, `core (TZ=America/Sao_Paulo)`, root `vitest.config.ts`).
- **D5 No dependency on `@fragiola/primitives` (ecosystem gap 2).** The calendar writes its own date code (an event calendar needs zoned date-times, which the toolkit's `PlainDate` does not cover). Its public plain-date type is **structurally identical** to the toolkit's `PlainDate` (`{ year, month, day }`, `month` 1–12), so a date picked in `@fragiola/primitives`' date picker passes to `view.go-to` with no conversion; commands accept that object or a `YYYY-MM-DD` string. A shared date package, if ever, is an ecosystem decision for the user.
- **D6 Glossary.** An **event** (a document entity) has **occurrences** (what is shown; a non-recurring event has one); a **calendar** is a category of events (`calendarId`); a **view** is a layout type (`month`, `week`, `day`, `days`, `list`) over a **range**; the **anchor date** is the date a view is built around; a **day grid** (month, the all-day row) holds **segments** (an occurrence's part within one week row); a **time grid** has **columns** (days) and **slots**; an event is **selected** (`selection()` selects ranges, not events: a range is **selected**, an event is **focused**). Written in the concepts docs later.
- **D7 View state is model state, not document.** `view` (`{ type, anchorDate, days? }`) lives in the model (an AI or a server can navigate without a screen) and is not in `calendar-json` unless `get("calendar-json", { includeView: true })`. Commands `view.set` (`{ type, days? }`), `view.go-to` (`{ date }`), `view.next`, `view.previous`, `view.today`; `validRange` refuses navigation outside it (`refused`). The visible **range** per view is derived (`get("visible-range")`, `get("current-range")`: the month vs the six weeks shown), with `firstDayOfWeek` and `hiddenDays`. Adapters map controlled `view` / `date` props onto these commands.
- **D8 Commands** (`<entity>.<verb>`, payload ids `<entity>Id`): `event.add`, `event.update` (fields), `event.move` (`{ eventId, start, allDay? }` keeping the duration, or `{ eventId, delta: { days?, minutes? } }`), `event.resize` (`{ eventId, edge: "start" | "end", to }`), `event.remove`, `event.set-data`, `event.set-flags`, `calendar.add`, `calendar.update`, `calendar.remove` (`{ calendarId, events: "remove" | "keep" }`), `calendar.set-visible`, `settings.set`, the `view.*` commands, `batch`. Catalogue with `defineCommand` and JSON Schemas like Dockable; `model.get("commands")`; `packages/core/scripts/generate-command-docs.ts --check` in `pnpm check` (`check:commands`), output `site/docs/api/commands.mdx` (the generator may create the folder).
- **D9 Edit rules live in the commands.** An event is editable when its own flag, its calendar's flag and the settings allow it (most specific wins: event → calendar → settings); `event.move` needs `startEditable`, `event.resize` needs `durationEditable` (or `startEditable` for the start edge); refusal is `refused` with the reason. `model.can` / `check` answer the same, so a drag hides its indicator on a refused target. Nonsense is refused, never repaired: `end <= start` is `invalid_payload`.
- **D10 All-day ↔ timed rules** (FullCalendar's, reproduced as tested behaviour, not code): moving a timed event onto the all-day row makes it all-day for `defaultAllDayDuration` unless the setting `allDayMaintainDuration`; moving an all-day event into the time grid starts it at the drop slot for `defaultTimedDuration`; any time delta makes it timed. Upstream tests in `packages/vanilla-tests/src/event-drag/timegrid.ts` are the behaviour reference.
- **D11 Layout is model state, geometry is the engine's.** Layout is a pure function of the state, so a server render and the first render have it:
  - `get("day-grid")` (month view, and the all-day row of time-grid views): weeks → days, each day `{ date, today, outside, weekend, past }`, and per week the segments `{ eventId, occurrenceId, startColumn, span, lane, continuesBefore, continuesAfter }`, packed into lanes by start, then longer first, then `eventOrder`; with `dayMaxEvents` a day reports `hiddenCount` and the hidden occurrence ids (the app renders the "+N more" popover).
  - `get("time-grid")`: columns (days) → slots (`slotDuration` from `slotMinTime` to `slotMaxTime`), and per column the timed segments with **fractions** (`top`, `height` in 0–1 of the column, SVAR's percent-space idea), `column` / `columns` / `span` from the overlap layout: clusters of overlapping occurrences, columns assigned greedily by start then duration, each occurrence widened to the right until the first column holding an overlapping occurrence (FullCalendar's behaviour, written fresh); zero-length events count as `eventMinDuration` (setting, 15 min) for overlap; a multi-day timed event is split per column.
  - `get("list")`: days with their occurrences, empty days omitted, `get("list-empty")`.
  - `dayMaxEvents: "auto"` needs pixels: the engine measures a day cell and the event height, and feeds `maxLanes` to the layout (engine key), never through a framework render.
  - Every layout result keeps identity for unchanged parts (a week row object is the same when nothing in it changed), so adapters re-render only what changed.
- **D12 Accessibility pattern (ecosystem gap 3).** There is no APG pattern for an event calendar. The decision:
  - The month grid and the time grid are an **APG grid** (`role="grid"`, `row`, `gridcell`, `columnheader`) with **one tab stop and roving focus over the date cells** (month: days; time grid: slots of each column), the date picker's keyboard: arrows, Home/End (start/end of the week), PageUp/PageDown (previous/next range, the view's own step), Shift+PageUp/PageDown (previous/next year in month view, previous/next week in time grids), `T` is not bound (no letters).
  - Each cell's occurrences are a **`role="list"`** of focusable events inside the cell; Enter (or F2) on a cell moves focus into its first event, Up/Down move between the cell's events, Tab leaves the grid, Escape returns to the cell. An event's accessible name is the app's (children, `aria-label`): the library sets none.
  - The list view is a `role="list"` per day under a heading the app renders, events as list items.
  - The all-day row is a grid row of the time grid's grid (one composite).
  - Dates that matter for screen readers (the cell's date) are exposed as data for the app's visually hidden text, never rendered by a primitive.
  - Recorded as a decision and proposed for the guidelines (D23).
- **D13 Keyboard gestures** (the features, on the engine's key chain hook points, data-grid's): with `selection()`, Shift+arrows from the focused cell extend a selected range and Enter confirms it (`select` engine event); with `dragAndDrop()`, Space on a focused event grabs it (`data-grabbed`), arrows move it by a day (day grid) or a snap step (time grid), Enter drops (the same `event.move` as a pointer drop), Escape cancels; with `resize()`, Shift+Up/Down (time grid) or Shift+Left/Right (day grid) while grabbed changes the end. Live-region announcements are engine events the app feeds into its own region (no text).
- **D14 Gestures on Pointer Events (ecosystem gap 5).** The core's engine has its own drag machinery on Pointer Events with pointer capture (as tree and flow; `decisions.md#drag-and-drop`), **not** `@fragiola/dnd` (no dependency between Fragiola libraries without an ecosystem decision, `integration.md`):
  - A feature's press hook returns a gesture object `{ move, end, cancel, active }` (Flow's pattern); the engine owns capture, Escape, `pointercancel`, a lost capture and a missed release, so no feature leaves a gesture stuck.
  - Thresholds: a mouse drag starts after 5 px; touch needs a long press (`longPressDelay`, 500 ms, an engine option) unless the event is already focused; a press that never becomes a drag is a `tap` (click on an event, on a date or a slot: engine events `event-click`, `date-click`).
  - Hit-testing maps a point to a date or slot from the measured grid (the engine measures columns and rows after commit and caches them per gesture; scroll during a drag invalidates), snapped to `snapDuration`; autoscroll of the time grid's scroll container near its edges; RTL inverts the column axis (the engine reads `direction` from the root's computed style).
  - During a drag the moved occurrence is previewed through engine view state (`get("drag-preview")` with its segments in the layout's shape), and the model receives **one** non-transient command on drop (a move is not a stream of transient commands: the preview is view state); `model.can` is asked for each candidate target.
  - `externalDrop()`: receives native HTML5 drops of foreign content (files, text, links; `decisions.md#drag-and-drop`) and an app-driven pointer drag through engine actions (`external-drag-start` with an event draft, `external-drag-move` with client coordinates, `external-drag-end`), so another library's drag (or `@fragiola/dnd` later) can drop onto the calendar; on drop it runs `event.add`.
- **D15 Recurrence (ecosystem gap 6), in the package, no `rrule` dependency.** `recurrence()` adds the event field `recurrence: { rule: "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20270101T000000Z", exdates?: string[], overrides?: Record<string, Partial<CalendarEvent>> }`.
  - RFC 5545 subset: `FREQ` (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`), `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY` (with ordinals for monthly/yearly: `2TU`, `-1FR`), `BYMONTHDAY` (negative too), `BYMONTH`, `WKST`; anything else is a validation issue naming the part. Expanded in the event's `timeZone` (wall clock kept across DST), only over the visible range plus a margin, never infinitely; tested against hand-written expectations from RFC 5545's examples and Schedule-X's recurrence specs as a behaviour reference.
  - **Occurrence identity:** `occurrenceId = "<eventId>@<original start>"` (the RECURRENCE-ID); a non-recurring event's occurrence id is its event id.
  - **Edit scopes:** `event.move`, `event.resize`, `event.update`, `event.remove` take `{ occurrenceId?, scope?: "this" | "following" | "all" }`. On a recurring event, `scope` is required with an `occurrenceId` (`invalid_payload` otherwise): `this` writes an override (or an exdate for `remove`), `following` ends the series with `UNTIL` before the occurrence and adds a new event from it (one `batch` step, the new id from `createId`), `all` changes the series (a move shifts every occurrence by the same delta). The drag feature runs the scope given by its option `dragAndDrop({ recurringScope: "this" })` (default `this`, the least destructive); an app asks the user in a middleware or with `check` first (shown in an example).
- **D16 Clock injection (ecosystem gap 7).** `createCalendarModel(json, { now?: () => number, createId? })`: "today", `past`, the default anchor date and `view.today` read the injected clock (default `Date.now`, which is not DOM). The engine schedules a refresh at the next midnight of the display zone (and, with `nowIndicator()`, at each `nowIndicator({ interval })` tick, default one minute) through the root's `defaultView.setTimeout`, so "today" moves after midnight (FullCalendar #3783). Tests inject a clock; never `vi.useFakeTimers` on globals the core does not use.
- **D17 Part attributes (ecosystem gap 8).** `data-calendar-part` on every element of every primitive (`root`, `day-grid`, `week`, `day`, `day-events`, `segment`, `more`, `time-grid`, `time-axis`, `slot-label`, `column`, `slot`, `time-event`, `column-header`, `week-number`, `list`, `list-day`, `list-event`, `selection`, `drag-preview`, `resize-handle`, `now-indicator`, `business-hours`, ...; the adapter Epics fix the final list); **no `data-calendar-path`** (a calendar is not a tree); positions as `data-date` (`YYYY-MM-DD`) on days, columns and headers, `data-time` (`HH:mm`) on slots and slot labels; `data-event-id`, `data-occurrence-id` and `data-calendar-id` (its category) on events. Boolean state present or absent: `data-today`, `data-outside`, `data-weekend`, `data-past`, `data-all-day`, `data-continues-before`, `data-continues-after`, `data-focused`, `data-selected` (a range cell), `data-dragging`, `data-resizing`, `data-grabbed`, `data-disabled` (outside `validRange`), `data-business-hours`. Core helpers give the attributes (`get("day-attributes-by", ...)`, `get("event-attributes-by", ...)`: tree's record from the model) so every adapter is identical.
- **D18 Structural style only.** The core writes no inline style except in `src/engine/structural-style.ts` (`touch-action: none` on draggable events while a drag feature is installed); positions in the time grid are fractions from the layout that the adapters map to `top`/`height`/`inset-inline-start`/`width` percentages (structural), never pixels from the engine through a framework render. Logical inline properties (RTL).
- **D19 No text, no names, no CSS.** Primitives set no `aria-label`, render no dates or titles; formatting is data (D4). No class names in the core.
- **D20 Five verbs on model and engine,** bound, `(key, payload, options?)`; guard tests keep the surfaces exact (`run`, `can`, `check`, `get`, `is`, `use`, `subscribe`, `dispatch`); everything only an adapter calls is under `engine.adapter`.
- **D21 Core guard** (`packages/core/tests/guard.test.ts`): no framework import, zero runtime deps, no global `document`/`window`/`requestAnimationFrame`/`ResizeObserver`/`crypto`/`setTimeout` (timers through the injected host), no `any` in exported declarations, no `.style` outside `structural-style.ts`, no ported-code headers (nothing is ported).
- **D22 Toolchain** pinned to the newest sibling (`../primitives`, all published ≥ 7 days before 2026-11-26): pnpm 12.21.0, Node >= 24, TypeScript 7.0.2 (TypeScript 6.0.3 only where `vue-tsc` / Angular need it, later Epics), tsdown 0.23.7, Vitest 5.1.0, Biome 2.6.7, Playwright 1.65.1 (later Epics), jsdom 31.0.1, publint 0.3.25, `@arethetypeswrong/cli` 0.18.5, `@changesets/cli` 3.0.3.
- **D23 Guidelines.** In the same PR, the implementer writes into `../guidelines/` (a local folder outside the repository, not under git): `decisions.md` rows for the date/time representation (D4), no dependency on the primitives toolkit with a structurally identical `PlainDate` (D5), the event-calendar accessibility pattern (D12), the recurrence and occurrence identity (D15), clock injection (D16), the `data-calendar-*` attributes without a path (D17); `ecosystem.md` (the project row), `docs/site.md` (dev port 5192 reserved, not yet in `projects.json`), `architecture/model-api.md` (an injectable clock beside `createId`), `components/primitives.md` (positions as `data-date`/`data-time` where the structure is a calendar). The PR description lists these edits, since they are not in the diff.

### Decisions taken during implementation

Each Issue records here what it decided that the list above did not fix (the Epic's rule: follow
`model-api.md` naming and the D6 glossary; refuse over repair; FullCalendar's tested behaviour for
drag and ranges; RFC 5545 for recurrence; FullCalendar's documented default for a setting).

- **Issue #1.** `check:commands` runs from the first commit: until the core exports
  `createCalendarModel` (Issue #3), `packages/core/scripts/generate-command-docs.ts --check`
  expects no `site/docs/api/commands.mdx` and fails if one is committed. (Since Issue #3 the page
  is generated and checked.)
- **Issue #1.** `check-features.ts` uses Data Grid's string markers (each feature's command, `get`
  and `is` keys read from its built factory) with an empty `FEATURES` list; each feature adds its
  `{ subpath, factory }` there with its entry in `tsdown.config.ts` and both `exports` (Issue #4:
  `recurrence`, `constraints`, `event-sources`; `check-package.ts` fails when the core's tarball
  does not export one of them with its targets packed).
- **Issue #1.** `check-package.ts` keeps the packing, the exports checks, publint and attw, the
  core pin check and the `ADAPTERS` list (empty) from Tree's; the smoke apps (React, Vue, Angular)
  come back with their adapters. A package under `packages/` that is neither the core nor listed
  fails.
- **Issue #1.** The core guard scans for global timers (`setTimeout`, `clearTimeout`,
  `setInterval`, `clearInterval`) as well as Flow's globals, refuses imports of the references'
  packages (`@fullcalendar/*`, `@schedule-x/*`, `@svar-ui/*`) and of `rrule` / Temporal
  polyfills, and treats a header saying its code is ported, adapted, copied or derived from a
  reference (or an upstream `Copyright (c)`) as a port, which the repository never has. Naming a
  reference as the behaviour studied is fine.
- **Issue #1.** `structural-style.ts` may write `touchAction` (and `setProperty` /
  `removeProperty`); the guard pins that list once the file exists (Issue #5).
- **Issue #1.** The CI workflow runs on `pull_request` and `workflow_dispatch` only (no `push`
  trigger at all until the www trigger job exists); `site/tests/ci-workflow.test.ts` checks it.
- **Issue #1.** Biome checks code, JSON and CSS, not Markdown (as `../primitives`).
- **Issue #1.** The first changeset is a `minor` (`0.0.0` → `0.1.0` on the first Version Packages
  PR, once releasing is set up after the user validates the library).

- **Issue #2.** `PlainDateString`, `PlainTimeString` and `DateTimeString` are documented
  aliases of `string`, not template-literal types, so a JSON document typed `string` assigns to
  them; the parsers are the check. `Instant` is branded (`instant(ms)`).
- **Issue #2.** `parseDateTime` follows RFC 3339 strictly (uppercase `T`/`Z`, seconds and an
  offset required, no leap second `:60`); `-00:00` is read as `Z`; a fraction finer than
  milliseconds is truncated. `formatDateTime` prints `Z` for a zero offset and milliseconds only
  when not zero, so `+00:00` round-trips as `Z`.
- **Issue #2.** Zone offsets are minutes east of UTC (Sao Paulo today: -180); historic local mean
  time may give fractional minutes, and `formatInstant` rounds such an offset to the minute and
  writes the wall clock with it, so the string is still the exact instant. Zone and locale
  validation (`validateTimeZone`, `validateLocale`) return issues; the math throws a `RangeError`
  on an unknown zone or locale (callers validate the document first). `validateTimeZone` accepts
  `"local"` (`resolveTimeZone` reads the host zone when called); whether an event's `timeZone` may
  be `"local"` is the document's call (Issue #3).
- **Issue #2.** Week rules: `weekInfo(locale, { firstDayOfWeek })` takes the first day and weekend
  from `Intl.Locale`; the engines dropped `minimalDays` (Node 26 gives none), so the table-free
  rule is 4 when the locale's week starts on Monday and 1 otherwise (wrong for a Monday-first
  locale outside Europe such as `en-AU`, whose CLDR value is 1); an engine with no week data gives
  ISO 8601's week. An explicit `firstDayOfWeek` keeps the locale's minimal days. `isoWeekOfYear`
  and `weekOfYear(date, rules)` return `{ week, year }` (the week-year).
- **Issue #2.** `timedDayRange(start, end, nextDayThreshold)` takes wall-clock fields in the display
  zone and the threshold in wall-clock minutes after midnight (default 0, FullCalendar's
  `00:00`); the settings' representation of `nextDayThreshold` is Issue #3's.
- **Issue #2.** Helpers return plain readonly objects (not frozen); the model freezes its state.
  `formatDateParts`, `formatTimeParts` and `formatDateRangeParts` format in UTC from the plain
  value, so the host zone never moves a date; `formatDateRangeParts` takes a range with an
  exclusive end and formats up to its last day.

- **Issue #3.** `nextDayThreshold` is an `HH:mm` wall-clock string in the settings (default
  `00:00`, FullCalendar's; `24:00` refused), read as minutes after midnight by `timedDayRange`.
- **Issue #3.** An event's `timeZone` is an IANA name only: `"local"` is the display setting's
  alone (an event's home zone must mean the same on every host); an event without one uses the
  display zone. A timed result of a move or a resize is written in the event's zone.
- **Issue #3.** A timed event may last no time (`end === start`, a deadline: the layout counts it
  as `eventMinDuration`); `end < start` is refused everywhere. D9's `end <= start` refusal holds
  for all-day events and for `event.resize` (a resize to nothing is nonsense). The document
  requires `end`; `event.add` alone fills a missing one with the default durations.
- **Issue #3.** Setting defaults (FullCalendar's documented ones where D3 fixes none):
  `timeZone: "local"`, `locale: "en-US"`, `weekNumbers: "locale"`, `slotDuration: 30`,
  `slotMinTime: "00:00"`, `slotMaxTime: "24:00"`, `dayMaxEvents: null`,
  `defaultTimedDuration: 60` (minutes), `defaultAllDayDuration: 1` (days),
  `allDayMaintainDuration: false`, `eventOrder: "start,-duration,allDay,title"`,
  `eventMinDuration: 15`, `fixedWeekCount: true`, `editable: true` (the model's own commands are
  editable: the drag features are what is opt-in). `firstDayOfWeek` (the locale's), `snapDuration`
  (the slot), `validRange` and `startEditable` / `durationEditable` / `deletable` (`editable`) stay
  absent when not given; `settings.set` takes `null` to remove them. `calendar-json` writes every
  setting, so a round trip is stable.
- **Issue #3.** The edit rules' chain (D9) for a flag is: the event's flag, the event's
  `editable`, its calendar's `editable`, the settings' flag, the settings' `editable`.
  `event.update` needs `editable`, `event.move` `startEditable`, `event.resize` `durationEditable`
  (`startEditable` for the start edge), `event.remove` `deletable`. `event.set-data`,
  `event.set-flags` and the calendar commands are the app's and take no flag, except
  `calendar.remove` with `events: "remove"`, refused when one of its events may not be removed.
  The refusal names where the flag came from (`the event`, `its calendar`, `the settings`).
- **Issue #3.** Navigation (D7): a month (and a list without `duration`) steps by a month and
  anchors on its first day, a week on its first day, a day skips hidden days in the step's
  direction, a `days` view steps by `days` days that are not hidden; `visible-range` leaves the
  hidden edge days out. `validRange` refuses a `go-to` or `today` outside it and a step whose
  range would not touch it (never clamped); a document without a view opens on today moved into
  `validRange`. Anchors stay in the years 0000–9999.
- **Issue #3.** `is("list-empty")`, not `get` (D11 wrote `get`): a yes/no question is an `is` key
  (`model-api.md`). `get("day-grid")` is `null` for a list view, `get("time-grid")` for month and
  list views; `get("list")` lists the visible days of any view (an agenda).
- **Issue #3.** Layout details: the time grid's axis is the display zone's wall clock
  (FullCalendar's), so a 23- or 25-hour day keeps the same slots and a segment sits at its
  wall-clock times; a day the zone skips whole shows nothing. `eventMinDuration` is the least any
  occurrence counts for in the overlap (a zero-length one included). A segment in a lane at or
  past the lane limit (`dayMaxEvents`, or the engine's `maxLanes` for `"auto"`, a `day-grid`
  payload) is left out of `segments`, each day listing its hidden occurrence ids. A row's week
  number is its middle day's. `eventOrder` reads an unknown field from the event's `data`; strings
  compare by code point. A layout part (week row, column, list day) keeps its identity while it is
  equal by value and laid out from the same event objects, so a title change makes its rows new.
- **Issue #3.** The feature registry follows Data Grid's composition (one function per
  contribution point, `featuresOf(model)` from a module `WeakMap`, `defineFeature`) with Tree's
  names table (`FEATURE_KEYS`: `commands`, `get`, `is`, engine keys, `fields`, `eventFields`,
  `payloadFields`, `settings`, `rootProps`) and Tree's command definitions: a feature's commands
  carry JSON Schemas (`model.get("commands")` lists them) and their payload types go in the core's
  `CommandMap` (types cost no bytes). Contribution points ready for #4/#5: `occurrences` (the
  layout's one source of occurrences, `layout/occurrence.ts`), `editTarget` / `writeEdit` (an edit
  of an occurrence: the core computes the edit with its rules, the feature writes it as an
  override, an exdate or a split), `checkEvent` (constraints refusing `event.add`, a move, a resize,
  a removal), `stateChanged`, `load` / `toJson` / `issues` / `eventIssues` (document fields),
  `settings` defaults, `day` / `event` / `rootAttributes`. The engine's hook points join with the
  engine (#5).
- **Issue #3.** `occurrenceId` and `scope` are in the edit commands' schemas and types now
  (`OccurrenceTarget`), owned by `recurrence` in `FEATURE_KEYS.payloadFields`: without the feature
  the bus refuses them (`invalid_payload` since Issue #4, naming it) before the schema. The document schema has the
  event's `recurrence` field, refused the same way without the feature.
- **Issue #3.** The model type has Data Grid's two forms: `CalendarModel<T>` (any features: the
  core's keys) and `CalendarModel<T, typeof features>`; every model is assignable to the first. The
  features' state slices are merged by walking the tuple, not by a union turned intersection
  (which made `F` contravariant). `createCalendarModel<Types>(json, { features })` needs the
  features' tuple as a second type argument (TypeScript infers none once one is given).
- **Issue #3.** `check-features.ts` reads a feature's markers less the names the core's
  `FEATURE_KEYS` lists (those are in the main entry by design), and also fails on a source map
  naming `src/<subpath>/` (Tree's check).
- **Issue #3.** A dry run draws ids from a copy; the ids a custom `createId` gave it are kept for
  the next draws, so `check` and the `run` after it name the same id. With any middleware
  installed, the payload is validated again before the reducer (a middleware may change it in
  place).
- **Issue #3.** The command reference (`site/docs/api/commands.mdx`) shows each command's payload
  and result fields from its schemas and an example that the generator runs on a sample calendar
  (a malformed example fails it), each feature's commands in a section of its own. Formatting as
  data (D4) came with Issue #4.

- **Issue #4.** A payload field, an event field or a setting of a feature that is not installed
  is `invalid_payload` naming the feature (the Issue's criterion: it is no field of that model's
  schema); a command of one stays `not_found`. Payload fields stay typed in the core's payloads.
- **Issue #4.** New contribution points: `settingsIssues` (a feature's settings in the document and
  in `settings.set`), `occurrenceById` (`get("occurrence-by")` finds any occurrence of a series),
  `checkSelection` (`selectConstraint`, for `selection()` in #5), `slotAttributes`
  (`get("slot-attributes-by", { date, time })`: `data-date`, `data-time`, the features'), and the
  `FeatureReads` lent to `checkEvent` / `checkSelection` (every event's occurrences, one event's).
  `EventChange.occurrence` is the occurrence an edit started from. A feature's `writeEdit` value
  is merged into the command's result (`following` names the new event). The core checks an
  occurrence a feature took as an event of its own (no `recurrence`, its override's title).
- **Issue #4.** Formatting as data (D4) is in the core: `get("title-parts", { format? })` (a
  month view's month, otherwise the visible days, `formatRangeToParts`), `get("day-header-by",
  { date, format? })` (the weekday in month and list views, the weekday and day in time grids),
  `get("slot-label-by", { time, format? })` (`{ hour: "numeric", minute: "2-digit" }`), frozen and
  reused per locale.
- **Issue #4, recurrence.** `occurrence-by` keeps the core's `{ id }` (model-api naming), not
  `{ occurrenceId }`; `get("occurrences-in", { range })` lists every shown event's occurrences
  touching a range; `is("event-recurring")`; `event.set-recurrence { eventId, recurrence | null }`
  (needs `editable`) is the one way to give or change a rule. RRULE names and values are
  case-insensitive (RFC 5545), `RRULE:` is refused; UNTIL is a date or a UTC date-time (a local one
  refused), a date-time UNTIL on an all-day event refused; the event's start is always the first
  occurrence (RFC 5545 §3.8.5.3), even off-rule. Occurrence ids write the original start in the
  event's zone; any offset of it finds the occurrence (keys are instants). Overrides change
  `title` and the times as a pair (`start` + `end`, `allDay`); their keys must be occurrences of
  the rule (checked where the zone is known: the document and `event.set-recurrence`).
- **Issue #4, scopes.** On a non-recurring event `scope` is ignored. Without `occurrenceId` an
  edit of a series is `all` from its first start (`this` / `following` then need one:
  `invalid_payload`). `this` refuses a `timeZone` or `calendarId` change (the series'). `all` and
  `following` measure the delta from the edited occurrence's current times (an override's when it
  has one) on the event zone's wall clock and apply it to the rule's starts; a day shift keeps the
  rule only when its days come from its start, or from a BYDAY without ordinals every week
  (DAILY/WEEKLY, INTERVAL=1, weekdays shifted); otherwise `refused`. A series never turns all-day
  ⇄ timed (`refused`; `this` may). `following` from the first occurrence is `all`; otherwise the
  old rule ends with UNTIL one second (a day) before it, COUNT becoming the remaining count on the
  new series. Excluded dates and overrides move with their occurrences (a zone change re-keys
  them by day). A display-zone change re-expands a series without its own `timeZone`; its keys
  are not re-written (give a recurring event a `timeZone`).
- **Issue #4, constraints.** Settings `businessHours` (`{ daysOfWeek, startTime, endTime }[]`,
  display zone, touching rules merged), `eventConstraint` / `selectConstraint`
  (`"business-hours"`, which needs `businessHours`, or a non-empty list of ranges of dates or
  date-times, open ends allowed; the event within one), `overlap` (`true` default, `false`, or
  `{ [calendarId]: boolean }`: either event's calendar refusing is enough; an event never overlaps
  itself; touching is no overlap). An all-day event under `"business-hours"` must fall on days
  with business hours. Checked on `event.add`, a move, a resize, `event.update` and
  `event.set-recurrence` when the times, calendar or rule change (a rename is not checked, nor a
  removal, nor `event-sources.receive`); a series added or given a rule has each occurrence
  checked over a year from its start, an occurrence edit (any scope) its new times. The refusal is
  `refused`, its message naming the setting. `get("business-hours-in", { range? })` (default the
  visible days) gives each day's hours as instants and time-grid fractions; `data-business-hours`
  marks days with hours and slots whose start is within them.
- **Issue #4, event sources.** A state feature with no `/local` entry: the fetch is the app's,
  and events in memory need no source. Sources are `settings.eventSources` (`{ id, calendarId? }`);
  an event's `sourceId` (event field) names one (document issue, `not_found` in `event.add`).
  State `eventSourceStates` (per source, `fetched` and `loading` day ranges, merged) is model state,
  not document. `get("ranges-to-fetch", { range? })` gives, per source, the days neither fetched
  nor loading; `event-sources.receive` replaces the source's events whose own times touch the
  range (or that share a received id) atomically, the edit flags and constraints not applied, ids
  of another source's or a local event refused; give a recurring source event an id, so a refetch
  replaces it. `invalidate` forgets fetched ranges (events stay until the next receive);
  `set-loading` marks or clears a loading range. Removing a source from the settings removes its
  events and its state. `is("event-source-loading", { sourceId? })` (none: any source).

- **Issue #5, engine.** `createCalendarEngine(model, { host?, longPressDelay?, dragThreshold?,
  autoScroll? })` (an options object, `host` inside it, rather than a second positional `host`):
  the engine's surface is `run`, `can`, `check`, `get`, `is`, `subscribe`, `destroy`, `adapter`
  (Tree's and Flow's; `tests/types/engine.ts` pins both surfaces as types, the engine test at
  runtime). `EngineHost` (`setTimeout`, `clearTimeout`, `requestAnimationFrame`,
  `cancelAnimationFrame`, `ResizeObserver`, `getComputedStyle`) defaults to the root's
  `defaultView`, read at attach; any member can be injected, and with injected timers the
  midnight refresh runs before a root is attached. The model's clock reaches the engine through a
  module `WeakMap` (`model/model-clock.ts`, like `featuresOf`), never the model's surface.
- **Issue #5, keys.** Engine actions `focus` (`{ date, time? }` or `{ occurrenceId, date? }`,
  navigating with `view.go-to` when not shown), `cancel-gesture`, `measure`; `get` keys `focused`,
  `tab-stop`, `day-grid` (with the measured `maxLanes`), `max-lanes`, `direction`, `point-at`;
  `is("gesture-active")`. Features: `selection-preview` (selection), `drag-preview`,
  `event-dragging`, `event-grabbed` (drag and drop; external drops preview through it),
  `resize-preview`, `event-resizing` (resize), `external-drag-start` / `-move` / `-end` (external
  drop), `now-position` (now indicator: an engine key, since the line moves with the engine's tick
  and a server render has no "now"). Engine events: `event-click`, `date-click`, `more-click`,
  `select`, `drop`, `external-drop`, `today-change`, `announce` (data, no text).
- **Issue #5, adapter.** `engine.adapter`: `attachRoot`, `detachRoot`, `register(part, payload,
  element | null)` (root's children: `day-grid`, `week`, `day`, `day-events`, `more`, `time-grid`,
  `column`, `slot`, `scroller`, `column-header`, `event { occurrenceId, date }` where `date` is the
  cell it starts in, `resize-handle { occurrenceId, date, edge }`, `list-day`, `now-indicator`,
  `drag-preview`, …), `attributes(part, payload)` (`data-calendar-part`, the model's attributes,
  the engine's `role`, `tabindex`, `data-focused`, the features' `data-selected`,
  `data-dragging`, `data-grabbed`, `data-resizing`), `committed()` (measure, pending focus),
  `subscribe` / `getSnapshot` (view changes). The engine writes `tabIndex` on the roving elements
  it focuses (Tree's) and `touch-action: none` on events while a drag feature is installed.
- **Issue #5, roles.** Day grid: `grid` > `row` (week) > `gridcell` (day) > `list` (`day-events`) >
  `listitem` (events). (The time grid's first, column-major roles were replaced by Issue #7.)
- **Issue #5, focus.** One tab stop: the focus position if shown, else today, else the current
  range's first day (time grids: the first slot of today's or the first column). Keys follow D12
  as the date picker's: Home/End are the week's first and last days whatever the direction;
  PageUp/PageDown in time grids run `view.next` / `view.previous` and keep the column index;
  Shift + PageUp/PageDown move a year (month) or a week. Keys with Ctrl, Alt or Meta, and Tab, stay
  the browser's. Enter on a focused event is `event-click` (keyboard). A tap on a day or slot
  moves the roving focus. Focus follows a dropped event: the engine waits for its new element's
  registration (or `committed()`).
- **Issue #5, gestures.** The key chain: a keyboard gesture's keys (Escape always cancels it) →
  the features' `keydown` (Space grabs, Shift + arrows select) → the core's keys → the features'
  `laterKeydown`; no key gesture starts while a pointer press is under way. A press captures the
  pointer only when a feature returned a gesture; it activates past `threshold` (default
  `dragThreshold`, 5 px; 0 at once), a touch after `longPressDelay` unless its event is focused,
  and a touch that moves first is abandoned (the browser's scroll). A tap is a release within
  3 px with no active gesture and no long press. Escape (anywhere in the document),
  `pointercancel`, `lostpointercapture`, a mouse move with no button (a missed release), a new
  press, `cancel-gesture` and a detach end it with no command. Hit boxes are cached for one
  press, dropped on a scroll inside the root. Autoscroll moves the registered `scroller` (40 px
  edges, 12 px a frame at most).
- **Issue #5, drops.** A pointer move between time points is whole days on the display zone's
  wall clock plus the instant minutes between the points, so a drag across a DST change lands
  where the pointer is; between days, whole days. Resize moves the edge the same way. Each new
  target is asked with `model.check` (a refused one shows no preview and its release runs
  nothing); a drop where the drag started runs nothing. A keyboard grab's arrows move by a day
  (month Up/Down by a week, time grid Up/Down by `snapDuration`), Shift + arrows (resize) move the
  end; Enter runs one command (`event.move`, `event.resize`, or a `batch` of both). Recurring
  drops add `occurrenceId` and `recurringScope` only with `recurrence()` installed. Previews are
  laid out by the core's own layouts on the moved event alone (`engine/preview.ts`).
- **Issue #5, features.** `selection({ selectMinDistance })`: `selection.set` (refused outside
  `validRange` and by `selectConstraint`) / `selection.clear` (`{ cleared }`), model state
  `selection` (not document), a click selects its cell (FullCalendar's default) and is a
  `date-click` too. `externalDrop({ accept?, draft? })`: a native drop's content is unreadable
  until the drop, so a native drag shows no preview; on drop the app's `draft` makes the event, or
  the `external-drop` event hands the `DataTransfer` to the app. `nowIndicator({ interval })`
  ticks on the interval's boundaries (minimum 1 s). `drop-target/` holds the drag session shared
  by drag and drop, resize and external drop (`host.shared("drag-session")`), with no entry.


- **Issue #7, roles (the time grid's ARIA, D12 settled).** The time grid is row-major, as APG's
  grid: `grid` > a `row` of `columnheader`s (`column-headers`), the all-day `row` (`all-day-row`:
  the day grid's one row, its days `gridcell`s with their `list` of segments, the time grid's
  first row: Up from the first slot reaches it), then one `row` per slot (`slot-row`, `data-time`:
  a `rowheader` label, `slot-label`, and a `gridcell` per day, `slot`). Each day's timed events are
  a `list` (`column-events`) of `listitem`s (`time-event`) in a positioned layer per day
  (`column`, no role; `columns` holds them, no role), laid over the slot rows: the slots are the
  grid's cells and the roving focus; Enter on a slot moves focus into the events starting in it,
  Up/Down between them, Escape back (D12, unchanged). Week numbers are `rowheader`s. An
  occurrence's element is named where it shows: `segment` (a day grid), `time-event`,
  `list-event`; all are `listitem`s. Decorations (`selection`, `drag-preview`, `now-indicator`,
  `business-hours`, `resize-handle`) are `aria-hidden`. (Issue #8 replaced the known compromise
  of the column layers' lists beside the rows: the layer is now the grid's last `row` and each
  column its day's `gridcell`; see "Issue #8, accessibility".)
- **Issue #7, core keys for the adapter.** `partAttributes(model, part, payload)`: a part's
  attributes before an engine (the server render, the first client render), the tab stop where
  the model puts it (`engine/positions.ts` holds the focus positions both read). New parts:
  `all-day-row`, `column-headers`, `slot-row`, `columns`, `column-events`, and the navigation
  buttons `previous`, `next`, `today` (`data-disabled` when `model.can` says no), `view-button`
  (`{ type, days? }`: `aria-pressed`, `data-pressed`, `data-disabled`). `event.set-all { events }`
  replaces every event (a controlled list): ids required, an object the model holds kept as it is,
  the others validated like the document's (and their `sourceId` named by `eventSources`), no
  edit flags or constraints; a source's fetched ranges stay. `selection()`'s
  `engine.get("selection-segments")` lays the shown range out as an event (kept per range and
  state). `FEATURE_KEYS[name].engineEvents` (`select`: selection; `drop`: drag and drop, resize;
  `external-drop`), `EngineEventTypeOf<F, All>`, `emittersOf(type)` and `ENGINE_EVENT_CALLBACKS`
  (each engine event's callback name, alike in every adapter). The engine leaves a key on a
  registered button (`more`, the navigation buttons) or on an app's control inside a part (a
  button, a field, a link) to it; Enter on a "+N more" link, and a click with no pointer or key
  behind it (`detail` 0: assistive technology), is its `more-click`.
- **Issue #7, the React adapter.** The engine is created in a layout effect (Tree's and Flow's), so
  no render subscribes or sets a timer; before it, each part reads `partAttributes` and the
  model's layouts (`get("day-grid")`), after it `engine.adapter.attributes` and
  `engine.get("day-grid")`. One store per root bumps a version on every model commit and engine
  view change; each part reads its value through `useSyncExternalStore`, the last object kept
  while equal (`sameValue`: records and arrays compared entry by entry), so a part re-renders
  only when what it shows changed. The root re-renders on every change (its children are the
  app's elements, which do not re-render with it) and calls `engine.adapter.committed()` after
  each commit. Parts register through ref callbacks (a cleanup unregisters); decorations shown in
  several places at once (`selection`, `drag-preview`, `business-hours`) are not registered.
- **Issue #7, controlled props.** `events` (`event.set-all`), `settings` (`settings.set` with the
  changed value as a whole patch), `view` + `days` (`view.set`), `date` (`view.go-to`) are sent
  when their value changes from the last one sent (a model the root creates starts at them;
  `events` that are the model's own list send nothing), with `meta: { source: "controlled" }`;
  `onEventsChange`, `onViewChange` (`{ type, days? }`), `onDateChange` (the anchor date) hear
  every other change. As Flow's, the props are sent, not enforced: a change the app does not
  echo stays in the model (the app owns the reply). A refused value warns once and the model's
  stays. A `model` given with controlled props is brought to them in the first layout effect, so
  its server render shows the model's state: give a model that already matches. The features,
  `now`, `createId`, `defaultEvents`, `defaultCalendars`, `defaultView`, `defaultDate` and the
  engine options (`host`, `longPressDelay`, `dragThreshold`, `autoScroll`) are read once.
- **Issue #7, feature subpaths.** Every core feature entry is mirrored (D2 refined): the ones with
  parts (`/selection`, `/drag-and-drop`, `/resize`, `/now-indicator`, `/constraints`) and, as pure
  re-exports, `/external-drop`, `/recurrence`, `/event-sources`, so a React app installs one
  package. `DragPreview` (and `useDragPreview`) is in `/drag-and-drop` and `/resize` (a resize
  previews through it); in those entries the component shadows the core's `DragPreview` type,
  which the main entry still exports. A feature's callback (`onSelect`, `onEventDrop`,
  `onExternalDrop`) is a type error without its feature (`RootEventProps<F>`, from
  `engineEvents`; the root's DOM `onSelect` is omitted) and warns at runtime; a feature's part
  rendered without its feature warns once and renders nothing (a part cannot see the root's `F`,
  so it is not a type error: importing its entry is the opt-in). A callback inferred with the
  model's features takes a type annotation (`CalendarEngineEventOf<"select">`), as Tree's.
- **Issue #7, package check.** `ADAPTERS` lists React: its tarball pins the core exactly and
  exports every feature subpath; the smoke app (Vite + React, strict, no `skipLibCheck`) takes its
  pins from `examples/react` once it exists, the adapter's own until then (react 19.3.1, vite
  8.3.8: `../primitives`'). The bundle guard already reads every package's main entry.

- **Issue #8, accessibility (D12 settled).** axe (`@axe-core/playwright`) reports no violation on
  the month, week, day and list views (the playground's `a11y.spec.ts`). The time grid's lists of
  timed events were beside the grid's rows (ARIA's required children): the layer of columns
  (`columns`) is now the grid's last `row`, each column (`column`) its day's `gridcell` holding
  the day's `list` of `listitem`s. The column cells are not in the roving focus (the slots are);
  Enter on a slot still moves into the events starting in it. No API change.
- **Issue #8, "+N more" on the keyboard.** A day's `more` link is the last item of its events:
  Down from the day's last event focuses it, Enter on a day whose events are all hidden focuses
  it, Up goes back to the last event (or the day), Escape returns to the day, Enter is its
  `more-click` (Space clicks it). It keeps `tabindex="-1"` (outside the roving focus).
- **Issue #8, day-grid geometry (D18).** `Segment` places itself from the layout as `TimeEvent`
  does: `position: absolute` in its day's `DayEvents` (`position: relative`, the containing block),
  `inset-block-start` its `lane` times `--calendar-lane-size` (default `1.5rem`), `block-size` one
  lane, `inline-size` its `span` days plus `span - 1` times `--calendar-day-gap` (default `0px`: the
  space between two days' event areas), `inset-inline-start: 0` (logical: right to left needs
  nothing). `DayEvents` holds the row's `lanes` (`min-block-size`), except with
  `dayMaxEvents: "auto"` (the engine measures it: the app gives it the day's room). A row
  (`Week`, `AllDayRow`) is `position: relative`, the containing block of its `Selection` and
  `DragPreview`, placed over their days after `--calendar-row-inset` (the row's space before its
  first day: a week number, a label). The custom properties are the app's to set; the adapter
  only reads them.
- **Issue #8, re-render cost (D11).** Each collection part (`Weeks`, `Days`, `SlotRows`, `Slots`,
  `Columns`, `ColumnEvents`, `DayEvents`, `ListDays`, `ListDay`, `ColumnHeaders`) calls the app's
  children function through `MemoCall` (`utils/memo-call.tsx`), memoized on the layout objects it
  passes (a week row, a day and its row, a slot, a column, a segment, a list day or item) and on the
  function itself (Issue #9, "children identity", replaced Issue #8's ref-read function). With a
  stable function, moving an event re-renders the rows or columns it touches
  (`tests/rerender.test.tsx`; the playground's stress fixture counts renders in e2e).

- **Issue #8, the playground.** `apps/playground` is Tree's shell (sidebar, the five themes, the
  source panel, the Inspector of a scenario's model: its commands, `calendar-json`, every part's
  `data-*`/ARIA state, the focus included). Fixtures (`fixtures/<name>/`, unstyled, Playwright's):
  `bare` (no feature), `interaction` (every feature, the engine's events logged, a native task),
  `more` (`dayMaxEvents: 2`), `dst` (America/New_York's 2026-11-01 week, Saturday first), `stress`
  (every feature, 2 000 events, `window.renders` counting each week row's and column's children
  calls). Each reads `?view=`, `&date=`, `&dir=rtl`, and the injected clock (Thursday 2026-11-26,
  12:00 New York). Scenarios: `views/every-view`, `interaction/every-feature`,
  `time-zones/display-zone`, `api/commands`. The Vite config scans the examples at start
  (`optimizeDeps.entries`), so a dependency first met when an example opens never reloads the page
  with a second React.
- **Issue #8, Playwright.** Both suites run with `TZ` and `timezoneId` America/New_York and
  `locale` en-US; the playground's fixtures inject their clock, the examples' specs fix the
  page's (`page.clock.setFixedTime`, helpers.ts `fixClock`). Chromium runs every spec, a Pixel 7
  emulation (Chromium) the `*.touch.spec.ts` ones (a long press through the DevTools protocol's
  touch events). Specs reach the calendar only through `data-calendar-part`, `data-date`,
  `data-time`, `data-event-id`, roles, accessible names and test ids. The examples' e2e builds one
  embed per port (`.e2e/dist-<port>`), so runs on two ports never share a build.
- **Issue #8, the examples.** Every example of the Epic (25: `month`, `week`, `day`, `n-days`,
  `list`, `all-day-and-multi-day`, `more-events`, `custom-event-content`,
  `locale-and-week-numbers`, `time-zones`, `rtl`, `hidden-days-and-slot-range`,
  `select-to-create`, `drag-and-resize`, `keyboard`, `external-drop`, `edit-rules`,
  `now-indicator`, `recurring-events`, `business-hours-and-constraints`, `event-sources`,
  `save-and-restore`, `undo-redo`, `ai-commands`, `team-planner`) in four categories (`basics`,
  `interaction`, `data`, `apps`: the contract's levels). `_kit/` holds `data.ts` (the team's
  calendars with a palette each, the week around today as JSON with this computer's offset),
  `format.ts` (text from `Intl` parts and model fields), `fake-server.ts`, `persist.ts`,
  `undo.ts` (over `event.set-all`). An event takes its calendar's palette class; the root hands
  the theme's lane to `--calendar-lane-size`. The theme contract (`examples/shared/tests/themes.test.ts`)
  checks the `--cal-*` tokens (font, size, radius, event radius, slot height, lane size, event
  padding and stripe, grid width and style, header weight and case, today's marker, now line and
  dot, shadow, motion, focus; per palette: lines, event, today, selected, weekend, hover);
  `examples/react/tests/themes.test.ts` that every token an example reads is declared by every
  theme and that no example writes a fixed colour. The scope prompt of a recurring edit is a
  middleware that holds the move and re-runs it with the chosen `scope` (Fragiola UI's `Dialog`:
  no alert dialog is vendored).
- **Issue #8, Fragiola UI.** Vendored from the registry's default base (Fragiola Primitives):
  `scripts/vendor-fragiola.ts` reads `FRAGIOLA_REGISTRY` (a directory built by
  `../ui/packages/registry`'s `build-registry.ts --out`, or the deployed one), writes each file's
  header with the item's public URL, and the copies are committed. `@fragiola/primitives-react`
  0.2.0 (and its toolkit) was published the day the examples were vendored: `pnpm-workspace.yaml`
  waives the seven-day gate (D22) for those two exact versions only. Its date picker is also
  named `Calendar`: the team planner imports it as `DatePicker` (D1).
- **Issue #8, the embed.** `examples/react/src/embed/overlay-promotion.ts` is Fragiola UI's
  (`../ui/examples/react/src/host/overlay-promotion.ts`) without the sidebar trigger; the embed
  starts it with `?id=`, `index.html`'s stage carries `data-stage`. The shared messages hold the
  `overlay` / `armed` messages and `holdResize`. The root's `color-scheme` is the theme's scheme
  (before paint and on each `theme` message). The e2e server's host page promotes the frame with
  `&promote=1` (the team planner's spec checks the editor covers the page).
- **Issue #8, CI.** `E2E (playground)` and `E2E (examples <framework>)` run in
  `mcr.microsoft.com/playwright:v1.65.1-noble` (`--user 1001`) when `Changes` selects them;
  `site/tests/ci-workflow.test.ts` ties the tag to every app's `@playwright/test` and checks both
  jobs' container. Measured locally (4 workers): the examples' 234 tests in 1.1 min, the
  playground's 38 in 12 s; no shards. The Site export job came with Issue #9.
- **Issue #8, package check.** The React smoke app's pins come from `examples/react` (it exists
  now): React 19.3.1, Vite 8.3.8, TypeScript 7.0.2, `@types/react` 19.3.0.
- **Issue #8, focus on a multi-day segment.** A day-grid segment over several days is one element
  per row, registered with its first day there. An event position keeps the day the focus entered
  it from (Up/Down move among that day's events, Escape returns to it); the engine maps it to the
  element's registration (`shownAt`: the day its segment starts in that row) to find the element,
  to mark it `data-focused` and the tab stop, and to keep the day only while the same element is
  focused (another week's part of the event is another element). A pending focus resolves loosely
  in `committed()`, once the commit has removed what it removes.

- **Issue #9, children identity (correctness over a shortcut).** Issue #8's `MemoCall` read the
  children function through a ref, so app state it closed over (a highlighted event, an open
  popover) went stale until the row's layout changed. It now follows React's contract: an
  entity's call runs again when its layout object **or the children function** changes
  (`utils/memo-call.tsx` compares both; `tests/rerender.test.tsx` checks a highlight follows the
  app's state, a new function re-renders every row, a stable one only the touched rows). An inline
  function is always current and re-renders every row of the part on each render of the component
  that writes it; a stable function (`useCallback` with what it reads, or a function declared
  outside the component when it reads only its arguments) keeps D11's cost. The playground's stress
  fixture passes `useCallback`'d row and column functions, so its render counters still prove only
  the touched rows re-render; `keyboard` and `select-to-create` (an announcement or a keystroke
  re-renders their grid) declare their rows' and columns' functions outside the component;
  `more-events` closes over its open day directly (its context is gone). The docs' composition and
  performance pages say it.

- **Issue #9, the site export.** `site/` follows Primitives' (itself Tree's and Dockable's):
  `contract.ts` (`CONTRACT_VERSION` `"1.7"`, checked against `www`'s since Epic #13), `export.ts`, `dev.ts` (defaults `--base /calendar`,
  `--port 5192`, `DEV_PORT`), `dev-proxy.ts`, `sources.ts`; `site/examples.json` names the levels
  (`basics`, `interaction`, `data`, `apps`: the shared categories, checked equal) and the five themes
  in switcher order, whose titles, swatches and CSS come from `examples/shared`. `project.json`:
  `frameworks: ["react", "vue"]` (Vue since Issue #12), no `registry`, no `create`, eight keywords. Not registered in
  `../www/projects.json` and no `Trigger www build` job (after the user validates the library).
- **Issue #9, the docs.** Dockable's IA: Getting started (5), Concepts (12, with a glossary),
  Guides (24: the Epic's list plus "+N more", controlled state and performance), API: primitives
  (one page per `Calendar.*` part, one per feature part, and the hooks: 38), API: core (8, with
  the generated `commands.mdx`), More (the issues link): 87 pages and the landing (Hero actions
  examples → `/ai` → docs, no GitHub: the header and footer link it; then the `team-planner` showcase). `site/tests/docs-reference.test.ts`
  fails when an export of the React package, of a feature entry or of the core is on no page, when a
  part's `## Props` table differs from its `<Part>Props` (the root's `RootBaseProps`, its engine
  options and every engine event callback), when an exported interface's field has no row, a hook
  no section, a part no `data-calendar-part`, a model or engine key, member or option, a command
  field, an error code, a document field or a setting is undocumented, or a `data-*` attribute or a
  part name is missing from `concepts/state-attributes`; `contract.test.ts` also refuses wording that
  lists gaps on a public page. What is missing lives in `~/organizations/fragiola/todo/calendar.md`.

- **Epic #13, carry-over from Epic #10 (grid ARIA).** `partAttributes` / `engine.adapter.attributes`
  add: `aria-current="date"` on today's `day` and, in a time grid, today's `column-header`;
  `aria-selected` (`"true"` / `"false"`, from `data-selected`) on every `day` and `slot` while
  `selection()` is installed, the grid `aria-multiselectable="true"` (headers and columns are not
  selectable cells); `aria-disabled="true"` on the days outside `validRange` and on their slots. A
  month's `column-header` keeps `data-date` (a date of its weekday, the first row's) and
  `data-weekend` only. **The corner is a column number, not a cell**: a time grid's `time-grid` has
  `aria-colcount` (days + 1) and every cell `aria-colindex` (`slot-label` 1, the days' `slot`,
  `column-header`, `day` and `column` from 2), so the header row, the all-day row and the columns'
  layer keep the slot rows' column count; an empty corner `columnheader` would need a name the
  library may not give (D19), and axe's `empty-table-header` refuses one unnamed. A month numbers
  nothing (its week-number column is the app's choice). `tests/engine/part-attributes.test.ts`.
- **Epic #13, carry-over (React refs).** `use-render.ts` keys its merged ref on the consumer refs'
  identity where it matters: a ref object by itself (a swap re-attaches: the old one is cleared, the
  new one set), every callback ref alike (an inline one stays free).
- **Epic #13, carry-over (E2E hygiene).** No `waitForTimeout`: a long press is awaited through the
  `data-dragging` it causes, and a negative check runs after `settled(page | frame)` (two animation
  frames: everything queued before has been handled and committed; the helpers of both suites).
  Tab stops are `[data-calendar-part][tabindex="0"]`, the log's lines `listitem`s, the week
  example's event box its `data-testid="event-box"` (every framework's week example sets it).
- **Epic #13, carry-over (site).** `site:export` and `site:dev` refuse a `--base` other than
  `/calendar` (`baseProblem`); the contract version is `www`'s (`findWwwContract`: `www/CONTRACT.md`
  beside the nearest ancestor of `site/`, so a worktree finds it too; `contractVersion` reads its
  title) and the export fails when it is not `CONTRACT_VERSION` (the version the checks implement);
  where no `www` is checked out (CI) the pinned `CONTRACT_VERSION` is used. `site:dev` refuses a
  `--port` that is not an integer from 1 to 65535 (`parsePort`) and exits 1 when a dev server is
  ended by a signal (`exitCodeOf`).

- **Issue #12, the Vue examples.** `examples/vue` (`examples-vue`) follows Tree's Vue app: every
  example id as `src/examples/<id>/index.vue` with sibling SFCs (one per React component,
  kebab-case), the React example's `styles.ts` (the Vue package's types, "read by the SFCs": the
  test compares them, so both frameworks look the same), React's framework-free siblings and `_kit/`
  copied with the package's name changed (compared too). `index.vue` types the root with
  `typedCalendar<Types, typeof features>()` (the untyped root takes a model of `AnyTypes` only); the
  siblings use the plain `Calendar`. A look that is a function of a part's state is applied in its
  `#render` slot (`v-bind="props" :class="styles.segment(state)"`). Text sits next to its tags (a
  template's line break is a space, and the specs read text exactly). Pins: TypeScript 6.0.3 and
  `vue-tsc` 3.3.14 (this app and the package only), Vue 3.5.45, Reka UI 2.11.0, `@lucide/vue`
  1.75.0 (lucide-react's version), `@vitejs/plugin-vue` 6.0.11; the rest as `examples/react`. The
  standalone embed's port is 5192, as React's (`site:dev` gives each its own).
- **Issue #12, the Vue kit.** `src/components` holds Fragiola UI's pieces the examples import
  (`Clickable`, `Input`, `Field`, `Dialog`, `Popover`, `Select`, `Checkbox`, `SegmentedControl`,
  the date picker `Calendar`) over Reka UI with the React kit's classes, Base UI's state attributes
  added on Reka's parts; the class families (`families/*`), `cn` and the theme are copies
  (`tests/vendored.test.ts`), `tests/kit.test.ts` checks the pieces in jsdom. The date picker is
  written over `{ year, month, day }` (Reka's needs `@internationalized/date`), the segmented
  control over Reka's RadioGroup. `Dialog.Portal` teleports a `data-slot="dialog-portal"` element
  into `<body>` only while open (no exit animation), so the embed's overlay promotion
  (`src/embed/overlay-promotion.ts`, React's framework-free module) sees it come and go. The
  checkbox adds no click listener of its own: Vue drops a listener attached at the event's own
  timestamp, which a frozen clock (`page.clock.setFixedTime`) makes equal.
- **Issue #12, the suite and the site.** Vue is in `COMPLETE_FRAMEWORKS`: every shared spec runs
  unchanged against the Vue embed, none skipped, and no spec needed an adapter fix. `project.json`
  lists `vue`; every docs page with framework code has a `<Framework name="vue">` variant, and
  `api/vue.mdx` ("Vue primitives") maps React's props to Vue props, slots and events for every part
  and lists the composables and types (`docs-reference.test.ts`, "the Vue reference"). Measured
  locally (4 workers): examples vue's 235 tests in 1.1 min.

## Commands

| command | does |
|---|---|
| `pnpm install` | install dependencies (pnpm 12.21.0, `packageManager`) |
| `pnpm check` | Biome lint + format + assist (non-mutating), then `check:layout` and `check:commands` |
| `pnpm check:layout` | the source layout check (`scripts/check-layout.ts`, from Dockable): every tracked name kebab-case, a package's `src/` root holds only its entries |
| `pnpm check:commands` | builds the core, then `packages/core/scripts/generate-command-docs.ts --check`: fails when `site/docs/api/commands.mdx` drifts from the command catalogue (`pnpm --filter @fragiola/calendar generate:commands` rewrites it) |
| `pnpm check:fix` | Biome check with auto-fix |
| `pnpm typecheck` | `pnpm -r typecheck` (TypeScript 7, no emit; `packages/vue`: `vue-tsc` on TypeScript 6.0.3, its `.vue` type fixtures included) |
| `pnpm test` | Vitest projects: `core (TZ=UTC)` and `core (TZ=America/Sao_Paulo)` (the core's suite twice, host zone forced, same expectations; node, jsdom per file with a docblock), `react` (jsdom + Testing Library over a fake layout, `TZ=UTC`; a server render in node), `vue` (jsdom + `@vue/test-utils` over the same fake layout, templates compiled at runtime by Vue's full build; a server render in node), `playground` (its catalog and scenarios), `examples-shared` (metadata, themes, manifest, loaders), `examples-react` (copyable imports, styles, kit, themes), `examples-vue` (the same contract for the Vue examples, styles and kit equal to React's, the copied theme, the Vue kit in jsdom), `site` (the export's contract, the docs reference, frameworks, the dev proxy, and the repository's script tests) |
| `pnpm build` | `pnpm -r build` (tsdown), then `scripts/check-dts.ts` (no `any` in the built declarations) and `scripts/check-features.ts` (the bundle guard) |
| `pnpm size` | the bundle size of every entry point (raw, gzip, min + gzip): a report, after `pnpm build` |
| `pnpm check:package` | builds the packages, packs them with pnpm, checks the packed `exports` are the repo's without the source condition (only `types`/`import`/`default`, targets in `dist`), runs `publint --strict` and `attw --profile esm-only` on the tarballs, fails on a package neither the core nor in `ADAPTERS`, and runs each adapter's pin check and smoke app (`scripts/check-package.ts`) |
| `pnpm changeset` | adds a changeset: every PR that changes what a package ships (`changedFilePatterns` in `.changeset/config.json`) carries one; every package is in one `fixed` group (`@fragiola/*`) |
| `pnpm release:version` | `changeset version`: only a release workflow runs it (none yet: releasing comes after the user validates the library) |
| `pnpm dev` | the playground (`apps/playground`, port 5173, `PLAYGROUND_PORT`): the examples, the scenarios with the Inspector, the fixtures |
| `pnpm e2e` | the Playwright suites, one after the other: the playground's (`apps/playground/e2e`, against `pnpm dev`) and each examples app's (`examples/shared/e2e`, against a production build of the embed under `/calendar/embed/<framework>/`, built against the packages' `dist`: run `pnpm build` first) |
| `pnpm --filter examples-react dev` | the embed alone (port 5192, `PORT`; `?id=<slug>&theme=<name>`) |
| `pnpm --filter examples-react vendor` | re-vendors Fragiola UI (`FRAGIOLA_REGISTRY`) |
| `pnpm --filter examples-vue dev` | the Vue embed alone (port 5192, `PORT`; `?id=<slug>&theme=<name>`) |
| `pnpm site:export --base /calendar --out <dir>` | builds the packages and every framework's embed of `project.json` (`<base>/embed/<framework>/`: React, Vue), writes `project.json`, `docs/`, `examples.json` and the manifest, then validates the output against `../www/CONTRACT.md` v1.7 (`site/contract.ts`) and exits non-zero on any problem; it only deletes `--out` when it holds a previous export |
| `pnpm site:dev [--base /calendar] [--port 5192]` | every framework's embed dev server (hot reload, the packages' sources) behind one Node proxy (`site/dev-proxy.ts`) on port 5192, which `www` in dev proxies under `/calendar/embed/**`; each embed serves its `manifest.json` |

## CI

`.github/workflows/ci.yml` (its comment header describes every job) runs on pull requests and on a
manual run; a push to `main` runs nothing (main is what its PR tested; the `Trigger www build` job
comes only once the project is registered in `../www/projects.json`, after the user validates
it). Jobs: **Checks** (`pnpm check`, `typecheck`, `test`, `build`, `size`), **Package**
(`pnpm check:package`), **Changesets** (`pnpm changeset status --since=origin/<base>`, skipped for
`changeset-release/*`), **Changes** (`fetch-depth: 2`, `node scripts/e2e-suites.ts`, tested by
`site/tests/e2e-suites.test.ts`): none for docs only (`site/docs/**`, `*.md`, `AGENTS.md`);
`packages/react` or `examples/react`: the playground and examples react; `packages/vue` or
`examples/vue`: examples vue; `packages/angular` or `examples/angular`: examples angular; any
other path, and a manual run: every suite. It is an allow-list of what may skip: a new rule names
what it skips, never what it runs. The diff uses `--no-renames`, so a moved file counts under both
its paths. **E2E (playground)** and **E2E (examples <framework>)** (a matrix over the examples apps
with a `playwright.config.ts`) run in `mcr.microsoft.com/playwright:v<version>-noble`
(`--user 1001`), its tag the version of `@playwright/test`, with no browser install
(`site/tests/ci-workflow.test.ts`). No shards until a suite's test step passes about 3 minutes
(today about one minute each). **Site export** runs `pnpm site:export --base /calendar --out
"$RUNNER_TEMP/site-export"` (self-validated); `ci-workflow.test.ts` checks it and that no www
trigger exists yet.

## Repository layout

```
packages/react/     @fragiola/calendar-react  src/components, hooks, utils, one folder per feature entry;
                                         tests/ by behaviour, tests/types/
packages/vue/       @fragiola/calendar-vue    src/components, composables, utils, one folder per feature entry,
                                         typed.ts; tests/ by behaviour, tests/types/ (.vue fixtures)
packages/core/      @fragiola/calendar   src/<domain>/ (schema, document, time, time-zone, locale, state, commands, model,
                                         view, layout, attributes, features, engine) and one folder per feature;
                                         tests/ mirroring src/, tests/types/ (type fixtures), tests/guard.test.ts;
                                         scripts/generate-command-docs.ts
site/               site                 export.ts, contract.ts, dev.ts, dev-proxy.ts, sources.ts, project.json,
                                         examples.json; docs/ (config.json, index.mdx, getting-started/,
                                         concepts/, guides/, api/); tests/ (contract, docs-reference,
                                         frameworks, dev-proxy, and the script tests: layout, e2e
                                         selection, CI workflow, bundle guard, package check)
scripts/                                 check-layout, check-dts, check-features, check-package, e2e-suites,
                                         source-condition, exported-names, built-files, size-report
docs/                                    survey.md (the references' behaviour notes), reports
.changeset/                              config.json and the pending changesets
apps/playground/     playground           the dev shell: src/ (shell, inspector, scenarios/<area>/, fixture/),
                                         fixtures/<name>/ (Playwright's pages), e2e/, tests/
examples/shared/    examples-shared      src/meta/<slug>.ts, src/themes/, src/embed/messages.ts, scripts/
                                         (finder, manifest, loaders), e2e/ (every spec), tests/
examples/react/     examples-react       src/examples/<slug>/ and _kit/, src/components (vendored Fragiola UI),
                                         src/embed/ (main, overlay promotion), scripts/vendor-fragiola.ts, tests/
examples/vue/       examples-vue         src/examples/<slug>/ (index.vue, sibling SFCs, React's styles.ts) and _kit/
                                         (React's), src/components (the Vue kit over Reka UI), src/styles and
                                         src/lib/cn.ts (copied), src/embed/ (main, overlay promotion), tests/
.github/workflows/ci.yml                 Checks, Package, Changesets, Changes, E2E (playground, examples),
                                         Site export
```

## Provenance

The three references are **read-only behaviour references** under `../references/`: their
features, behaviour, edge cases and tests are studied; **no code is copied or ported** from them
(the user's rule), whatever their licence. Every algorithm (time-zone math, recurrence expansion,
layout packing, gesture mapping) is written fresh from the behaviour description, and reviewers
compare structure against the references' (FullCalendar's `seg-placement`, Schedule-X's
`event-concurrency` and RRULE engine). `packages/core/tests/guard.test.ts` fails on a header
claiming a port.

- **FullCalendar** (`../references/fullcalendar`, v7.1.5, MIT; its premium scheduler is not in the
  checkout): views, `DateProfileGenerator` ranges, exclusive ends, `nextDayThreshold`, all-day ↔
  timed drag rules, DST tests (`packages/vanilla-tests/src/datelib/`, `time-zones/`),
  constraints, more-link, event-drag/resize test folders.
- **Schedule-X** (`../references/schedule-x`, v4.9.2, MIT; `@sx-premium/*` closed):
  Temporal-shaped events, concurrency layout, RRULE subset and its tests, the old MIT drag specs
  (`git show 589d3cf4^:packages/drag-and-drop/src/...`), week-number bugs.
- **SVAR React Calendar** (`../references/svar-react-calendar`, v2.7.1, MIT; PRO closed): an
  intercept/on action router close to the command bus, layout in percent space, occurrence ids and
  edit modes.

[`docs/survey.md`](docs/survey.md) holds the planning survey's behaviour notes: the feature map,
what is later, and the edge cases to test. Code reused from another Fragiola project carries the
lighter header `// From Tree (fragiola/tree, <path>), same author and licence.` (or Dockable's,
Data Grid's, Flow's).

## Conventions

- Biome: 4-space indent, double quotes, LF, trailing newline, organized imports.
- **Source layout** (`../guidelines/repository.md#source-layout`; `pnpm check:layout` enforces
  it): every file and folder name is kebab-case (the kebab-case of its main export); the root of a
  package's `src/` holds only its entries (`index.ts`, `parts.ts`, `typed.ts`, `context.ts`,
  `public-api.ts`); the core has one folder per domain and one per feature, and its `tests/`
  mirror `src/`. An entry imports each module directly: no barrel files.
- A util must earn its existence: a helper lives in the domain folder that uses it, and moves to a
  shared folder only when two domains need it.
- TypeScript strict with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`. Do not relax it; a
  blanket `!` on every index access is not a fix.
- Pin dependencies to exact versions published at least 7 days ago (`npm view <pkg> time`): D22.
- Commits are gitmoji-conventional: `✨ feat(core): …`, `🐛 fix(react): …`, `✅ test(core): …`,
  `🔧 chore: …`, `👷 ci: …`, `📝 docs: …`. Branches `<type>/epic-<n>-…`, worktrees under
  `.worktrees/`.
- Code, docs, commit messages, issues and pull requests in English.
- Every exported member has a one-line `/** … */`; a file opens with a `//` header when its
  purpose or a design choice is not obvious from its name.

## Type safety

- **No `any` in public types.** The guard test checks the core's exported declarations, and
  `pnpm build` checks every package's emitted `.d.ts` (`scripts/check-dts.ts`).
- **Data is typed by the registry.** An app declares `Types` and `createCalendarModel<Types>(json)`;
  an event's `data` narrows on its `kind`. No casts on event data, in the packages or the examples.
- **Result objects, not throws**, for anything a caller can get wrong: a command returns
  `{ ok: true, value } | { ok: false, error }`; only loading an invalid document throws
  (`CalendarValidationError`).
- **Schemas and types are tested together**: every command's payload and result schema, and the
  document schema, is checked equal to its TypeScript type (`packages/core/tests/types/`).
- **Type fixtures** go in `tests/types/` (checked by `tsc`, not run): `@ts-expect-error` marks what
  must not compile.

## Code quality

Every change keeps the packages small, simple and fast. Before writing code:

- **Reuse first.** Look for the helper that already exists; logic needed twice becomes one
  function.
- **The core grows only for the calendar's own job.** Announcement text, persistence, editors and
  popovers are the app's.
- **Simple over clever.** No flag that duplicates other state, no defensive branch that cannot
  happen, no wrapper with a single caller unless its name says something the code does not.
- **Hot paths allocate nothing they do not need**: the pointer move handler, the drag preview, the
  layout of unchanged weeks (D11: identity of unchanged parts).
- **Size is watched.** `pnpm size` (CI prints it) reports each entry point; a PR says when one
  grows noticeably, and why.
- **Tests share their setup**, never a copy.

## The primitive contract (`@fragiola/calendar-react`)

`../guidelines/components/primitives.md`, enforced by `packages/react/tests/contract.test.tsx`:
one namespace (`Calendar.*`), `render` (an element or `(props, state) => element`, never
`asChild`), `ref` a plain prop merged with the part's, handlers composed internal first,
`className` / `style` a value or a function of the state, structural inline style only
(`position`, the time grid's `top` / `height` / `inset-inline-start` / `width` percentages from
the layout's fractions, a day grid's segment lanes and spans on logical properties from
`--calendar-lane-size` / `--calendar-day-gap`, the lanes a day's events hold, a row's decorations
after `--calendar-row-inset`, `pointer-events` on the column layer and its events), state as `data-*`
(present or absent) and ARIA only, every attribute from the core (`engine.adapter.attributes` /
`partAttributes`), no text, no `aria-label`, no class names. A collection part calls a children
function per entity and renders no element of its own (`Weeks`, `Days`, `SlotRows`, `Slots`,
`ListDays`) or its own container (`ColumnHeaders`, `DayEvents`, `ColumnEvents`, `ListDay`,
`Columns`).

| part (`Calendar.*`) | `data-calendar-part` | role | children |
|---|---|---|---|
| `Root` | `root` (`data-view`) | | nodes |
| `Previous`, `Next`, `Today` | `previous`, `next`, `today` (`data-disabled`) | button | label |
| `ViewButton` (`view`, `days?`) | `view-button` | button, `aria-pressed` | label |
| `DayGrid` | `day-grid` | grid | nodes |
| `ColumnHeaders` / `ColumnHeader` (`date`) | `column-headers` / `column-header` | row / columnheader | `(date)` / nodes or `(state)` |
| `Weeks` | — | — | `(week)` |
| `Week` (`week`) | `week` (`position: relative`) | row | `(day)` or nodes |
| `WeekNumber` | `week-number` | rowheader | nodes or `(state)` |
| `Days` | — | — | `(day, week)` |
| `Day` (`day`) | `day` (`data-date`, `data-today`, …) | gridcell (roving) | nodes or `(day, segments)` |
| `DayEvents` | `day-events` (holds the row's lanes) | list | `(segment)` |
| `Segment` (`segment`) | `segment` (placed in its lane, over its days) | listitem (roving) | nodes or `(state)` |
| `More` | `more` | button (`tabindex=-1`, the last item of the day's events) | nodes or `(state)`; rendered while `hiddenCount > 0` |
| `TimeGrid` | `time-grid` | grid | nodes |
| `AllDayRow` | `all-day-row` | row | `(day)` or nodes |
| `Scroller` | `scroller` | | nodes |
| `SlotRows` | — | — | `(slot)` |
| `SlotRow` (`slot`) | `slot-row` (`data-time`) | row | `(column)` or nodes |
| `SlotLabel` | `slot-label` | rowheader | nodes or `(state)` |
| `Slots` | — | — | `(column)` |
| `Slot` (`date`) | `slot` (`data-date`, `data-time`, …) | gridcell (roving) | nodes or `(state)` |
| `Columns` | `columns` | row (the grid's last) | `(column)` |
| `Column` (`column`) | `column` (`data-date`, …) | gridcell (not roving) | nodes |
| `ColumnEvents` | `column-events` | list | `(segment)` |
| `TimeEvent` (`segment`) | `time-event` | listitem (roving) | nodes or `(state)` |
| `List` / `ListDays` | `list` / — | / — | nodes or `(state)` / `(day)` |
| `ListDay` (`day`) | `list-day` | list | `(item)` |
| `ListEvent` (`item`) | `list-event` | listitem (tab stop) | nodes or `(state)` |
| `Selection` (`/selection`) | `selection` | `aria-hidden` | in a `Column` or a row |
| `DragPreview` (`/drag-and-drop`, `/resize`) | `drag-preview` | `aria-hidden` | in a `Column` or a row |
| `ResizeHandle` (`edge`, `/resize`) | `resize-handle` (`data-edge`) | `aria-hidden` | in a `Segment` or `TimeEvent` |
| `NowIndicator` (`/now-indicator`) | `now-indicator` | `aria-hidden` | in today's `Column` |
| `BusinessHours` (`/constraints`) | `business-hours` | `aria-hidden` | in a `Column` |

Hooks (`primitives.md#hooks-have-one-shape`): `useCalendar<T, F>()` → `{ model, engine }`
(the engine a facade, there before the root mounts); part hooks → `{ state, props }`: `useDay`,
`useSlot`, `useSegment`, `useTimeEvent`, `useListEvent`; value hooks: `useCalendarView`,
`useCalendarTitle(format?)`, `useDayHeader(date, format?)`, `useSlotLabel(time, format?)` (`Intl`
parts: the title is data, never a primitive), `useDayGrid`, `useTimeGrid`, `useListLayout`;
features: `useSelection`, `useDragPreview`, `useNowPosition`, `useBusinessHours(date?)`. Outside
the root: `createCalendarRef<T, F>()` / `useCalendarRef<T, F>()` (`calendarRef` on the root).
Root event callbacks: `onEventClick`, `onDateClick`, `onMoreClick`, `onTodayChange`,
`onAnnounce`, and with their feature `onSelect`, `onEventDrop`, `onExternalDrop`.

## In Vue (`@fragiola/calendar-vue`)

The same parts, part attributes, roles, state and composables as React, with the same file names
(`components/`, `composables/` for `hooks/`, `utils/`, the feature folders; `tests/index.test.ts`
compares the trees), in the idioms of `../guidelines/components/primitives.md#in-vue-and-angular`
and Tree's Vue adapter (Issue #11). The adapter renders and wires only: a behaviour difference
from React is an adapter bug or a missing core key.

- **Primitives** are `definePrimitive` components (`utils/primitive.ts`, Tree's): `inheritAttrs:
  false`, the fallthrough attributes merged by `renderElement` (`utils/render.ts`, Tree's) over the
  part's own: listeners composed internal first, classes joined, the structural style winning over
  the app's `style` (a plain value: no function form, state looks go through `data-*` or the
  `#render` slot's `state`). `as` takes a tag or a component; the `#render="{ props, state,
  children }"` scoped slot replaces the element (`v-bind="props"`, `<component :is="children" />`).
  A template ref on a part is its component (`$el` the element).
- **Slots for children functions.** A collection part calls its default scoped slot per entity:
  `Weeks` `{ week }`, `Days` `{ day, week }`, `SlotRows` `{ slot }`, `Slots` / `Columns`
  `{ column }`, `ColumnHeaders` `{ date }`, `DayEvents` / `ColumnEvents` `{ segment }`,
  `ListDays` `{ day }`, `ListDay` `{ item }`. React's "a function per day, or elements" is a named
  slot: `Week` / `AllDayRow` `#day="{ day, week }"`, `SlotRow` `#column="{ column }"` (rendered as
  `Days` / `Slots`), else the default slot. Every other part's default slot receives its state
  (`Day`: its `DayState` plus `segments`; `Segment`, `TimeEvent`, `ListEvent`: their event state;
  `More`: `{ hiddenCount, hiddenOccurrenceIds, date }`; buttons: `{ disabled }`, `ViewButton`
  `{ disabled, pressed }`).
- **Memo parity (D11, Issue #9).** Each per-entity call is a `MemoCall` component
  (`utils/memo-call.ts`) on the layout objects and the slot; Vue tracks the reactive state a slot
  reads in that call's own render, so it is never stale. A template's slot is compiled anew on
  every render, but Vue flags one that reads only its scope and reactive state as stable
  (`SlotFlags.STABLE`, read from the component vnode's children: Vue drops it from `slots` when the
  parent renders through `h`, as every primitive does); a stable slot is called through one function
  for the part's life, so only a changed layout object calls it again. A dynamic slot (under
  `v-for` / `v-if`) or a render function's (Vue wraps it anew on every render) is compared by
  identity: every row renders again with it, as an inline function in React; `$stable: true` on a
  render function's slots keeps them. `tests/rerender.test.ts` checks both.
- **Reactivity.** The model's state is frozen data, never proxied (Vue does not proxy a
  non-extensible object, so an app's `ref` of the reported events holds the model's own list).
  The root holds `version` (a `shallowRef` bumped by `model.subscribe` and
  `engine.adapter.subscribe`, on the client only) and `engine` (a `shallowRef`); each part reads
  through `useCalendarValue`, a `computed` on both that keeps the previous object while
  `sameValue`, so a part renders again only when what it shows changed (React's
  `useSyncExternalStore` store). The engine is created in `onMounted`, destroyed in
  `onBeforeUnmount`; another `model` remounts the root (a key per model object, Tree's).
- **Registration.** Vue calls a function template ref while it mounts a subtree, before the
  subtree is in the document: a part registers a detached element after the flush that inserts it
  (`nextTick`), and the root calls `engine.adapter.committed()` after those (a `flush: "post"`
  watcher on `version` and `engine`, then `nextTick`). A part renders again when the engine
  appears, so its ref registers it.
- **Root.** Props: React's (`model`, `default-events`, `default-calendars`, `settings`,
  `default-view`, `days`, `default-date`, `features`, `now`, `create-id`, `calendar-ref`, the
  engine options). `v-model:events` (`events` + `update:events`), `v-model:view` (`view` +
  `update:view`, the type), `v-model:date` (`date` + `update:date`, the anchor date), with
  `@events-change`, `@view-change` (`{ type, days? }`) and `@date-change` beside them; sent, not
  enforced, with `meta: { source: "controlled" }`, as React's. A server render shows the model's
  state, and the client hydrates it: the controlled props are applied in `onMounted`, before paint
  (applied before the mount they would be a hydration mismatch, `tests/ssr.test.ts`).
- **Engine and feature events are fallthrough attributes** the root reads (`onEventClick`, …: every
  `ENGINE_EVENT_CALLBACKS` name), never put on its element (`@select` is not the DOM's `select`):
  `@event-click`, `@date-click`, `@more-click`, `@today-change`, `@announce`, and with their
  feature `@select`, `@event-drop`, `@external-drop`. Typed as the root's emits by the features
  (`RootEngineEmits<F>`), and the missing features' listeners as `never` props
  (`RootMissingEvents<F>`), so `@select` without `selection()` is a vue-tsc error; at runtime one
  warns, as React's.
- **`typedCalendar<T, F>()`** (`typed.ts`, Tree's `typedTree`) gives the namespace typed by the
  registry and the features (the root's `model`, `events`, v-models and feature events), what React
  writes as type arguments; the untyped `Calendar.Root` takes a model of `AnyTypes` and every event
  (a registry-typed model needs `typedCalendar<Types>().Root`, Issue #12).
- **Composables** have React's names and return `ComputedRef`s (value composables) or
  `{ state, props }` of `ComputedRef`s (part composables, `props` with the registering `ref` and the
  structural `style`: `v-bind="props"`); they take a value, a ref or a getter. `useCalendar` gives
  the plain model and the facade. `createCalendarRef` / `useCalendarRef` are Tree's Vue calendar
  ref: `calendar.value` (reactive, not a Vue ref: a template reads `.value`), `:calendar-ref`.
- **No portal.** No calendar part renders elsewhere (React has none either): `Teleport` is the
  app's, for its popovers.
- **Tests and toolchain.** `vue-tsc` 3.3.14 on TypeScript 6.0.3 in this package only (D22);
  Vitest aliases `vue` to its full build so the tests' calendars are templates, as an app's SFCs;
  the SSR test hydrates `@vue/server-renderer`'s output (`vue/server-renderer`) with no mismatch
  warning and the same elements and attributes once the engine runs. `check:package`'s Vue smoke
  app: single-file components (`typedCalendar`, v-models, `@select`, every feature's part from its
  entry, a composable) checked by `vue-tsc`, built, and loaded through the dev server (its own
  `/src/*.vue` modules followed), every pin `examples/vue`'s (`@vitejs/plugin-vue` 6.0.11 included,
  Issue #12).
