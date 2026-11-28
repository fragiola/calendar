---
"@fragiola/calendar-vue": patch
---

A faster Next, Previous and Today: the time grid's column headers, columns and slots, and a row's days, are keyed by their position, so the next range updates the same elements with their new dates instead of creating them again. State of your own in a cell's component now stays with its position; key your element by its date to start it over.
