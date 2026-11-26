---
"@fragiola/calendar-react": minor
---

`Calendar.Segment` places itself from the layout: its lane (`--calendar-lane-size`) and its days (`--calendar-day-gap`) on logical properties, in its day's `Calendar.DayEvents`, which holds the row's lanes; a row's `Selection` and `DragPreview` sit over their days (`--calendar-row-inset`). The collection parts call their children function again only for a row, column, slot or segment whose layout changed, so moving an event re-renders what it touches.
