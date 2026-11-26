---
"@fragiola/calendar": minor
---

The time grid's ARIA is row-major: a header row, the all-day row, then a row per slot (a row header and a gridcell per day); each day's timed events are a list in a positioned column layer, and an event's part is named where it shows (`segment`, `time-event`, `list-event`). New: `partAttributes` (a part's attributes before an engine), `event.set-all` (a controlled list of events), `engine.get("selection-segments")`, `ENGINE_EVENT_CALLBACKS`, the engine events typed by feature (`EngineEventTypeOf`), and the navigation buttons' parts. A key on an app's control or a registered button inside the root is left to it; a "+N more" link's Enter and assistive click are its tap.
