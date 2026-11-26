# calendar

`@fragiola/calendar` is a headless, accessible event calendar for the web, part of the
[Fragiola](https://fragiola.com) ecosystem. A framework-free core holds the events, the visible
range and the views (month, week, day, list) behind the Fragiola model API, and thin adapters for
React, Vue and Angular render them as composable primitives with no CSS. Scheduling interactions
(selecting a range, moving and resizing events by pointer and keyboard) run through the same
command bus, so an app, a back-end or an AI can drive the calendar.

## Status

In development, not published. The repository holds the workspace, its checks and CI, and the
core package `@fragiola/calendar` (`packages/core`); the date and time-zone engine, the model, the
views, the features and the engine follow, then the React, Vue and Angular adapters, the examples
and the docs on fragiola.com/calendar.

## Packages

| package | what it is |
| --- | --- |
| `@fragiola/calendar` | the framework-free core: the document and its JSON Schemas, dates and time zones (`Intl` only, zero runtime dependencies), the model and its commands, the views and their layout, the opt-in features (`/selection`, `/drag-and-drop`, `/resize`, `/recurrence`, `/now-indicator`, `/constraints`, `/external-drop`, `/event-sources`) and the engine |
| `@fragiola/calendar-react`, `-vue`, `-angular` | the `Calendar.*` primitives for each framework, with the core re-exported (later) |

## Development

Node 24 or later and pnpm (the version in `packageManager`).

```sh
pnpm install
pnpm check          # Biome, the source layout, the command reference
pnpm typecheck
pnpm test
pnpm build          # with the .d.ts check and the features' bundle guard
pnpm check:package  # pack and lint every package as it would be published
```

The project's rules and decisions are in [`AGENTS.md`](AGENTS.md); the behaviour notes from the
references (FullCalendar, Schedule-X, SVAR Calendar, studied, never copied) in
[`docs/survey.md`](docs/survey.md).

## Licence

MIT © Mauro de Souza
