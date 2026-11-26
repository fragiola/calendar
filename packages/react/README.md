# @fragiola/calendar-react

The React adapter of [Fragiola Calendar](https://fragiola.com/calendar): headless, accessible
primitives (`Calendar.Root`, `Calendar.DayGrid`, `Calendar.TimeGrid`, `Calendar.List`, …) and hooks
over `@fragiola/calendar`, which it re-exports whole, so a React app installs this package only.
Each opt-in feature has an entry of its own (`@fragiola/calendar-react/selection`,
`/drag-and-drop`, `/resize`, `/external-drop`, `/now-indicator`, `/constraints`, `/recurrence`,
`/event-sources`). It ships no CSS and no text: you render and style every part.

Not released yet: the package is in development (`0.0.0`).

MIT licence.
