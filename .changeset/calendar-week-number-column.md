---
"@fragiola/calendar": minor
"@fragiola/calendar-react": minor
"@fragiola/calendar-vue": minor
---

A month whose rows render their week number numbers its columns: `partAttributes` and `engine.adapter.attributes` take `{ weekNumberColumn }` (`PartAttributeOptions`), and the roots' `weekNumberColumn` (`week-number-column` in Vue) passes it to every part. The grid's `aria-colcount` then counts the week numbers' column, each week number is column 1 and the days and their headers from 2, so the header row of seven and the rows of eight agree; a `Calendar.WeekNumber` rendered without it warns once.
