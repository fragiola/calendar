---
"@fragiola/calendar-react": patch
---

A collection part (`Weeks`, `Days`, `SlotRows`, `Slots`, `Columns`, `ColumnEvents`, `DayEvents`, `ListDays`, `ListDay`, `ColumnHeaders`) calls its children function again when the function changes, not only when a row's layout does, so app state the function closes over is never stale. Pass a stable function (`useCallback`, or one declared outside the component) to re-render only the rows whose layout changed.
