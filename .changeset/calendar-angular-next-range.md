---
"@fragiola/calendar-angular": patch
---

A faster Next, Previous and Today: the time grid's column headers, columns and slots, and a row's days, are keyed by their position, so the next range updates the same elements with their new dates instead of creating them again. State of your own in a cell's template now stays with its position; track it by its date (`@for (one of [date]; track one)`) to start it over.
