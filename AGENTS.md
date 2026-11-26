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
| `packages/core` | `@fragiola/calendar` | the calendar document (v1) and its JSON Schemas, the date and time-zone engine (`Intl` only), the model and its command bus (commands with JSON Schemas, `get`/`is` queries, middleware, events), the views, ranges and layout, the feature registry and every opt-in feature on its own subpath (D2), and the engine (keyboard, gestures, measurement). Today: the empty entry, its packaging and its guard (Issue #1) | DOM only, zero runtime deps |
| `packages/react` | `@fragiola/calendar-react` | the `Calendar.*` primitives and hooks over the core, and the core re-exported (React Epic) | the core (`workspace:*`, published as the exact version); peer `react`, `react-dom` (^19) |
| `packages/vue` | `@fragiola/calendar-vue` | the same primitives in Vue (Vue Epic) | the core; peer `vue` (^3.5) |
| `packages/angular` | `@fragiola/calendar-angular` | the same primitives as Angular directives (Angular Epic) | the core; peer `@angular/core` |
| `site` | `site`, private | the repository's script tests today; the site export (fragiola.com/calendar) and `site/docs` from the React Epic | |

Only `packages/core` and `site` exist yet. `apps/playground`, `examples/*` and the adapters arrive
with their Epics; the root scripts that need them (`dev`, `e2e`, `site:export`, `site:dev`) are in
place and do nothing useful until then.

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
  expects no `site/docs/api/commands.mdx` and fails if one is committed.
- **Issue #1.** `check-features.ts` uses Data Grid's string markers (each feature's command, `get`
  and `is` keys read from its built factory) with an empty `FEATURES` list; each feature adds its
  `{ subpath, factory }` there with its entry in `tsdown.config.ts` and both `exports`.
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

## Commands

| command | does |
|---|---|
| `pnpm install` | install dependencies (pnpm 12.21.0, `packageManager`) |
| `pnpm check` | Biome lint + format + assist (non-mutating), then `check:layout` and `check:commands` |
| `pnpm check:layout` | the source layout check (`scripts/check-layout.ts`, from Dockable): every tracked name kebab-case, a package's `src/` root holds only its entries |
| `pnpm check:commands` | builds the core, then `packages/core/scripts/generate-command-docs.ts --check`: fails when `site/docs/api/commands.mdx` drifts from the command catalogue (`pnpm --filter @fragiola/calendar generate:commands` rewrites it) |
| `pnpm check:fix` | Biome check with auto-fix |
| `pnpm typecheck` | `pnpm -r typecheck` (TypeScript 7, no emit) |
| `pnpm test` | Vitest projects: `core` (node; jsdom per file with a docblock), `site` (the repository's script tests) |
| `pnpm build` | `pnpm -r build` (tsdown), then `scripts/check-dts.ts` (no `any` in the built declarations) and `scripts/check-features.ts` (the bundle guard) |
| `pnpm size` | the bundle size of every entry point (raw, gzip, min + gzip): a report, after `pnpm build` |
| `pnpm check:package` | builds the packages, packs them with pnpm, checks the packed `exports` are the repo's without the source condition (only `types`/`import`/`default`, targets in `dist`), runs `publint --strict` and `attw --profile esm-only` on the tarballs, fails on a package neither the core nor in `ADAPTERS`, and runs each adapter's pin check and smoke app (`scripts/check-package.ts`) |
| `pnpm changeset` | adds a changeset: every PR that changes what a package ships (`changedFilePatterns` in `.changeset/config.json`) carries one; every package is in one `fixed` group (`@fragiola/*`) |
| `pnpm release:version` | `changeset version`: only a release workflow runs it (none yet: releasing comes after the user validates the library) |
| `pnpm e2e`, `pnpm dev`, `pnpm site:export`, `pnpm site:dev` | the Playwright suites, the playground (dev port **5192**), the site export: from the React Epic |

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
its paths. The E2E jobs and the Site export job arrive with the React Epic; they run in
`mcr.microsoft.com/playwright:v<version>-noble` (`--user 1001`), its tag the version of
`@playwright/test`, with no browser install (`site/tests/ci-workflow.test.ts`). No shards until a
suite's test step passes about 3 minutes.

## Repository layout

```
packages/core/      @fragiola/calendar   src/<domain>/ (document, time, time-zone, locale, state, commands, model,
                                         view, layout, attributes, features, engine) and one folder per feature;
                                         tests/ mirroring src/, tests/types/ (type fixtures), tests/guard.test.ts;
                                         scripts/generate-command-docs.ts
site/               site                 tests/: the repository's script tests (layout, e2e selection, CI
                                         workflow, bundle guard, package check); docs/ and the export later
scripts/                                 check-layout, check-dts, check-features, check-package, e2e-suites,
                                         source-condition, exported-names, built-files, size-report
docs/                                    survey.md (the references' behaviour notes), reports
.changeset/                              config.json and the pending changesets
.github/workflows/ci.yml                 Checks, Package, Changesets, Changes
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

## The primitive contract

Filled by the adapter Epics (React, then Vue and Angular): the parts, their `data-calendar-part`
names, the part hooks and the Vue and Angular idioms (`../guidelines/components/primitives.md`).
