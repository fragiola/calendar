# Examples (Angular)

Every example of the gallery in Angular, under the same folder name (its id) as in
`examples/react/src/examples`, with the same behaviour and look under the five themes. This app
renders one alone at `index.html?id=<folder>`. What every framework's examples share (the metadata,
the themes, the embed's messages, the manifest builder, the loader generator and every e2e spec)
lives once in `examples/shared`; the categories, the anatomy and the rules of an example are the
React README's (`examples/react/src/examples/README.md`). This page says what is Angular's own.

```
examples/angular/src/examples/
  <slug>/index.ts      the example: a standalone component with an inline template, its default export
  <slug>/styles.ts     how it looks: Vue's copy of the React example's styles.ts, the Angular package's types
  <slug>/*.ts          optional siblings, kebab-case: components (an attribute selector on the part they
                       fill, `[weekDayHeader]`), injection functions (`inject-<name>.ts`), framework-free
                       modules (copies of React's); shown in the code panel
  _kit/                the demo content and app logic, copied whole from examples/react
examples/angular/src/
  components/          the Angular kit: Fragiola UI's pieces as standalone directives and components
                       (atoms/, families/, ui/)
  lib/cn.ts, styles/   `cn` and the theme, copied from examples/react
  embed/               the embed app (main.ts, zoneless) and its overlay promotion (§5.4)
```

## Adding an example

1. Write the React example first (`examples/react/src/examples/<slug>/`), its metadata and its spec
   (`examples/shared`), then the Vue one. Angular is a complete framework (`COMPLETE_FRAMEWORKS` in
   `examples/shared/e2e/available.ts`): a React example without its Angular counterpart fails
   `tests/examples.test.ts` here, and its spec fails for Angular.
2. Create `src/examples/<slug>/index.ts` and copy Vue's `styles.ts` (the Angular package's name
   for the Vue one, "read by the components" for "read by the SFCs": `tests/examples.test.ts`
   compares them). `pnpm --filter examples-angular dev` serves the embed
   (`http://localhost:5192/?id=<slug>`); `pnpm site:dev` serves every framework's on one port.
3. `pnpm --filter examples-angular e2e` runs every shared spec against this app's embed (after
   `pnpm build`: the embed is built against the packages' `dist`).

## An Angular example

- **`index.ts` default-exports a standalone component** whose template puts `[calendarRoot]` on
  its root element, with the parts under it (`imports: [CALENDAR, …]`, the features' directives
  from their entries). The model is the component's own field (`createCalendarModel<Types,
  typeof FEATURES>(…)`), so the template reads it directly; the root is typed by it. The host is
  `class: "contents"`, so the example's root is the stage's grid item.
- **React's components are sibling components**: one that fills a part sits on the part's own
  element as an attribute (`<div [calendarColumnHeader]="date" [weekDayHeader]="date">`, the toolbar
  on its `<div weekToolbar>`), so no element of Angular's own comes between the calendar's parts.
  Inside the root they read the calendar through the injection functions (`injectCalendarTitle()`,
  `injectDayHeader(() => this.date())`, `injectCalendar<Types>().model`, `injectTimeEvent()`).
  React's hooks are signals and `computed`s, its effects `afterNextRender` and `DestroyRef`.
- **Children functions are templates** (`<ng-template calendarWeeks let-week>`,
  `calendarDayEventsItem let-segment`), parts rendered only in some states structural directives
  (`*calendarMore="let more"`, `*calendarDragPreview`, `*calendarResizeHandle="'end'"`), as
  `AGENTS.md`'s "In Angular" lists them; the engine's events are the root's outputs
  (`(moreClick)`, `(rangeSelect)` with `calendarSelection`, `(eventDrop)` with
  `calendarDragAndDrop`).
- **Looks in `styles.ts`, bound**: `[class]="styles.grid"`, never a class string in a template
  and never `cn()` in a component (`tests/examples.test.ts`). A look that is a function of the
  part's state reads the directive's state signal through a template reference:
  `#event="calendarSegment" [class]="event.state() && styles.segment(event.state()!)"` (the state
  is `undefined` until the directive's input is set).
- **Text is written next to its tags** (`>+{{ more.hiddenCount }} more</button>`): a template's
  line breaks around text are a space in the DOM, and the specs read the text exactly.
- **Copyable imports only**: `@angular/core`, `@angular/common`, `@fragiola/calendar-angular` and
  its feature entries, `@lucide/angular`, the kit (`#/components/ui/*`, `#/components/atoms/*`,
  `#/lib/cn`) and relative files.

## The kit

`src/components` is the Angular edition of the Fragiola UI pieces the React examples use: the
same Tailwind classes, `data-slot`s and palette roles, written here as standalone directives and
components on native elements (no headless library: the WAI-ARIA patterns, with Base UI's state
attributes), icons from `@lucide/angular`. `cn`, the class families and the theme are copies of
examples/react's (`tests/vendored.test.ts` compares them, and checks the kit wears the React kit's
classes; `tests/kit.test.ts` renders each piece). What differs from the React kit is said at the
top of each file.
