---
"@fragiola/calendar-angular": patch
---

Faster drags and drops: each part's `computed` reads a revision bumped only by the view changes that may reach it (`engine.adapter.affects`), so a preview moving runs only the previews'; the root tells the engine a render committed only after a render that touched the calendar, not after every render of the application.
