---
"@fragiola/calendar": patch
---

A faster Next: the parts' attributes read the time grid, its columns and each day's attributes once per state, the engine keeps its tab stop, and an element an adapter reuses for another date stays registered when its new date is registered before its old one goes.

A key that shows another range (PageUp, PageDown, Shift with them, an arrow past the grid) emits `announce` with `{ kind: "range", range, focused }`: the view's current range and the focused cell. A reused cell keeps DOM focus, so no `focus` event tells a screen reader the date changed; feed the announcement to a polite live region.
