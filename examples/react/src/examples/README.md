# Examples

Each folder is one example of the site's gallery (`fragiola.com/calendar/examples/<folder>`),
rendered alone by this app at `index.html?id=<folder>`.

```
src/examples/
  <slug>/index.tsx     the example (default export, "use client")
  <slug>/styles.ts     how it looks: one class string (or state function) per part
  <slug>/*.ts(x)       optional sibling files, shown in the code panel
  _kit/                shared demo content and app logic (the team's calendars and week, text
                       from data, the fake server, the undo manager, persistence); no calendar
                       assembly, no styles
```

What every framework's examples share, and no reader copies, lives once in `examples/shared`
(`examples-shared`, private), so a Vue or Angular app of the same examples reuses it:

```
examples/shared/
  src/meta/<slug>.ts   each example's metadata: title, description, category, order, features,
                       docs link, layout, height (one file per example, for every framework)
  src/meta-types.ts    its shape, the categories and the default heights
  src/themes/          the five themes (one CSS file each, values only) and their list
  src/embed/messages.ts  the embed's messages to the site (`fragiola:example:*`)
  scripts/             the examples finder, the manifest builder, the loader generator
  e2e/                 every Playwright spec (smoke, themes, iframe, examples/<slug>.spec.ts),
                       run against each framework's embed (`examplesE2eConfig`)
  tests/               the metadata, themes, contrast and e2e-helper checks
```

An example of this app is a folder `src/examples/<slug>/` with an `index.tsx`, and its metadata is
found by its slug. A folder without metadata, or metadata that no framework app has a folder for,
fails `examples/shared/tests/meta.test.ts`.

## Categories

The gallery groups examples by what they show (`CATEGORIES` in `examples/shared/src/meta-types.ts`,
in sidebar order; the site export contract calls a category a `level`).

| category | what belongs in it |
|---|---|
| `basics` | the views and how a calendar shows things: month, week, day, n days, list, all-day and multi-day events, "+N more", custom content, locales, time zones, right to left, hidden days |
| `interaction` | what a person does: select to create, drag and resize, the keyboard, external drops, edit rules, the now indicator |
| `data` | the model from code: recurring events, constraints, event sources, persistence, undo/redo, AI commands |
| `apps` | whole applications that combine many features (`team-planner`, the landing's showcase) |

## Adding an example

1. Create `src/examples/<slug>/index.tsx` and `styles.ts`, and its metadata in
   `examples/shared/src/meta/<slug>.ts` (see `meta-types.ts`).
2. `pnpm dev` at the root lists it in the playground (`apps/playground`), with hot reload, the five
   themes and its source: `http://localhost:5173/?example=<slug>`. The embed alone is
   `pnpm --filter examples-react dev` (`http://localhost:5192/?id=<slug>`, it regenerates the
   loaders).
3. The smoke e2e visits it in every theme and inside an iframe. Add a spec for its main behaviour
   in `examples/shared/e2e/examples/<slug>.spec.ts`: it reaches the example only through
   `data-calendar-part`, `data-date`, `data-time`, roles, accessible names and test ids, so every
   framework's embed runs it unchanged. The specs run on a fixed clock (Thursday 2026-11-26, 12:00
   in New York), so "this week" is the week of 2026-11-22.

## Anatomy of an example

A reader opens `index.tsx` and sees the logic first: what is rendered, how the calendar is
assembled, which API is called. How it looks is one click away, in `styles.ts`. The code panel
shows the example's files, the shared demo content it imports and nothing else.

- **The example assembles the calendar itself** (`<Calendar.Root>` and its parts in `index.tsx`):
  `_kit/` never renders a primitive (`tests/examples.test.ts`).
- **Copyable imports only**: `react`, `@fragiola/calendar-react` and its feature entries,
  `lucide-react`, Fragiola UI through `#/components/ui/*` and `#/components/atoms/*`, `#/lib/cn`,
  `#/hooks/*`, and relative files. Fragiola UI's date picker is also named `Calendar`: import it
  as `import { Calendar as DatePicker } from "#/components/ui/calendar"`.
- **Classes live in `styles.ts`**: no class string and no `cn()` in a `.tsx`. A part whose look
  follows its state takes a function of its state (`className={styles.segment}`).
- **Theme-agnostic**: colours are Fragiola UI's palette roles (`bg-palette-base`,
  `text-palette-accent/85`), an event takes its calendar's palette (`palette-blue`), and sizes and
  shapes are the theme's `--cal-*` tokens (`h-(--cal-slot-height)`). Never a fixed colour.
- **The calendar's geometry** is the adapter's: a day-grid segment and a timed event place
  themselves. The root hands the theme's lane height to `--calendar-lane-size`, the space between
  two days' event areas to `--calendar-day-gap`, and a row's space before its first day (a week
  number, the time axis) to `--calendar-row-inset`.
- **Text is the app's**: titles come from the model (`model.get("event-by")`), dates as `Intl`
  parts (`useCalendarTitle`, `useDayHeader`, `slot-label-by`), joined by `_kit/format.ts`.
- **Names are the app's**: a grid's `aria-label`, an icon button's label, an event's name (its
  content, or `aria-label`).
- **A modal covers the page**: a `Dialog` an example opens is promoted over the site's page by the
  embed (`src/embed/overlay-promotion.ts`); the example itself knows nothing about it.
