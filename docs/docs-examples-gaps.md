# Docs and examples: workarounds and gaps

What the examples (`examples/react/src/examples`) work around, and what the docs (Issue #9) should
say about it. Each entry names the example and why; a gap closed in a package leaves this list.

## Workarounds in the examples

- **more-events: the popover opens from `onMoreClick`, not from a popover trigger.** The engine
  takes Enter on a `Calendar.More` (it is the link's `more-click`, D12) and prevents the button's
  native click, so a Fragiola UI `Popover.Trigger` rendered as the link would never toggle from
  the keyboard. The example controls the popover's `open` from `onMoreClick` and cancels the
  trigger's own toggle (`details.cancel()` on `trigger-press`). The docs' "+N more" guide shows
  this pattern.
- **recurring-events, team-planner: the scope prompt is a `Dialog`.** Fragiola UI's alert dialog
  is not vendored; a middleware holds the move or the resize of an occurrence and re-runs it with
  the `scope` the reader picks (`meta` marks the re-run).
- **week and the time-grid examples: the scroll position is the app's.** A ref callback on
  `Calendar.Scroller` scrolls to 08:00 on mount; the package has no "scroll to time".
- **time-zones: the DST check uses a four-day view.** A Sunday-first week starts on the day New
  York's daylight saving time ends (2026-11-01), so a "DST weekend" button opens a `days` view
  from Saturday 2026-10-31 to show both sides of the change.
- **more-events, month: rows that must hold their lanes.** With a fixed `dayMaxEvents`, a week row
  grows (`flex: 1 0 auto`) in a scrolling grid; with `"auto"` the day's events fill the room left
  and the engine measures it (`Calendar.DayEvents` then holds no lanes of its own).
- **month: "+N more" opens the day as an agenda.** The month example renders a day grid only; its
  "+N more" switches to the `day` view and shows `Calendar.List` (the list of any view's days).

## For the docs (Issue #9)

- The day-grid geometry's custom properties: `--calendar-lane-size` (default `1.5rem`),
  `--calendar-day-gap` (default `0px`) and `--calendar-row-inset` (default `0px`), set by the app
  on any ancestor; `Calendar.DayEvents` is a segment's containing block, a row its decorations'.
- A collection part's children function is called again only for a changed layout object: app
  state it shows goes through a hook or a context of the components it renders (AGENTS.md
  "Issue #8, re-render cost").
- `Calendar.More` is the last item of its day's events on the keyboard.
- The time grid's layer of columns is its last row; give `Calendar.Columns` `position: absolute`
  over the slot rows (the examples' `body` wrapper is the containing block).
- The embed's overlay promotion (CONTRACT §5.4) is in `examples/react/src/embed/` only; the
  example files never know about it.
