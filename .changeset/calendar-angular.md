---
"@fragiola/calendar-angular": minor
---

Start `@fragiola/calendar-angular`: the calendar's parts as standalone attribute directives on your own elements (`[calendarRoot]`, `[calendarDayGrid]`, `[calendarDay]`, `[calendarTimeEvent]`, … listed in `CALENDAR`), each part's state as a signal through `exportAs`, `ng-template`s for the collections, structural directives for the parts shown only in some states (`*calendarMore`), the two-way `[(events)]`, `[(view)]` and `[(date)]`, the engine's events as outputs, the injection functions (`injectCalendar()`, `injectCalendarTitle()`, `injectDay()`, …), `createCalendarRef` / `injectCalendarRef`, and every feature's secondary entry point with its directives and the root's feature directive (`calendarSelection`'s `(rangeSelect)`, `calendarDragAndDrop`'s `(eventDrop)`, `calendarExternalDrop`'s `(externalDrop)`). Zoneless: a change of the calendar is on screen before the next task; a server render shows the model's state.
