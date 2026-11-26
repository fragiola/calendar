---
"@fragiola/calendar": minor
---

The grids say their date cells' state in ARIA: `aria-current="date"` on today's day (and a time grid's header of today), `aria-selected` on every day and slot while `selection()` is installed (its grid `aria-multiselectable`), `aria-disabled` on the days and slots outside `validRange`. A month's column headers carry only their weekday's `data-date` and `data-weekend`, never the first row's day state. A time grid numbers its columns (`aria-colcount` on the grid, `aria-colindex` on every cell, the time axis first), so every row counts the same columns.
