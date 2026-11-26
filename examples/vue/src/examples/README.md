# Examples (Vue)

Every example of the gallery in Vue, under the same folder name (its id) as in
`examples/react/src/examples`, with the same behaviour and look under the five themes. This app
renders one alone at `index.html?id=<folder>`. What every framework's examples share (the metadata,
the themes, the embed's messages, the manifest builder, the loader generator and every e2e spec)
lives once in `examples/shared`; the categories, the anatomy and the rules of an example are the
React README's (`examples/react/src/examples/README.md`). This page says what is Vue's own.

```
examples/vue/src/examples/
  <slug>/index.vue     the example (a single-file component, `<script setup lang="ts">`)
  <slug>/styles.ts     how it looks: the React example's styles.ts, the Vue package's types
  <slug>/*.vue, *.ts   optional siblings, kebab-case: components, composables (`use-<name>.ts`),
                       framework-free modules (copies of React's); shown in the code panel
  _kit/                the demo content and app logic, copied whole from examples/react
examples/vue/src/
  components/          the Vue kit: Fragiola UI's pieces over Reka UI (atoms/, families/, ui/)
  lib/cn.ts, styles/   `cn` and the theme, copied from examples/react
  embed/               the embed app (main.ts) and its overlay promotion (§5.4)
```

## Adding an example

1. Write the React example first (`examples/react/src/examples/<slug>/`), its metadata and its spec
   (`examples/shared`). Vue is a complete framework (`COMPLETE_FRAMEWORKS` in
   `examples/shared/e2e/available.ts`): a React example without its Vue counterpart fails
   `tests/examples.test.ts` here, and its spec fails for Vue.
2. Create `src/examples/<slug>/index.vue` and copy `styles.ts` (the Vue package's name for the
   React one, "read by the SFCs" for "read by index.tsx": `tests/examples.test.ts` compares them).
   `pnpm --filter examples-vue dev` serves the embed (`http://localhost:5192/?id=<slug>`);
   `pnpm site:dev` serves every framework's on one port.
3. `pnpm --filter examples-vue e2e` runs every shared spec against this app's embed (after
   `pnpm build`: the embed is built against the packages' `dist`).

## A Vue example

- **`index.vue` renders `<Calendar.Root>`**, with the parts under it, as the React one does. A
  template passes no type argument: the root takes a registry-typed model from the namespace typed
  by it, `const Calendar = typedCalendar<Types, typeof features>()` in `index.vue`; the sibling
  components import the plain `Calendar` (only the root is typed by the registry).
- **React's components are sibling SFCs**, its hooks composables or `setup` code: `useState` is a
  `ref` (or a plain `const` for what never changes, like the model), `useMemo` a `computed`, an
  effect a `watch` or `onMounted`/`onBeforeUnmount`, a context a `provide`/`inject` key.
- **Children functions are scoped slots** (`v-slot="{ week }"`, `#day="{ day }"` on a `Week`),
  as `AGENTS.md`'s "In Vue" lists them; the engine's events are the root's listeners
  (`@more-click`, `@select`, `@event-drop`).
- **Looks in `styles.ts`, bound**: `:class="styles.grid"`, never a class string in a template and
  never `cn()` in a `.vue` (`tests/examples.test.ts`). A Vue part has no `class={(state) => …}`:
  a look that is a function of the part's state is applied in its `render` slot,
  `<template #render="{ props, state }"><div v-bind="props" :class="styles.segment(state)">`.
- **Text is written next to its tags** (`>+{{ hiddenCount }} more</Calendar.More>`): a template's
  line breaks around text are a space in the DOM, and the specs read the text exactly.
- **Copyable imports only**: `vue`, `@fragiola/calendar-vue` and its feature entries,
  `@lucide/vue`, the kit (`#/components/ui/*`, `#/components/atoms/*`, `#/lib/cn`) and relative
  files.

## The kit

`src/components` is the Vue edition of the Fragiola UI pieces the React examples use: the same
Tailwind classes and palette roles, over Reka UI instead of Fragiola Primitives, icons from
`@lucide/vue`. `cn` and the theme are copies of examples/react's (`tests/vendored.test.ts`
compares them, and checks the kit wears the React kit's classes). What differs from the React kit
is said at the top of each file.
