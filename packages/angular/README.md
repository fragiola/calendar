# @fragiola/calendar-angular

The Angular adapter of [Fragiola Calendar](https://fragiola.com/calendar): headless, accessible
standalone directives (`calendarRoot`, `calendarDayGrid`, `calendarTimeGrid`, `calendarList`, …)
and injection functions over `@fragiola/calendar`, which it re-exports whole, so an Angular app
installs this package only. Zoneless: a change of the calendar is on screen before the next task.
Each opt-in feature has an entry of its own (`@fragiola/calendar-angular/selection`,
`/drag-and-drop`, `/resize`, `/external-drop`, `/now-indicator`, `/constraints`, `/recurrence`,
`/event-sources`). It ships no CSS and no text: you render and style every part.

Not released yet: the package is in development (`0.0.0`).

MIT licence.
