---
"@fragiola/calendar-vue": patch
---

Faster drags and drops: each part's `computed` reads a revision bumped only by the view changes that may reach it (`engine.adapter.affects`), so a preview moving renders the preview it enters and leaves and runs no other part's `computed`; `Calendar.Slots` calls its slot in its own render, so a drop renders no slot.
