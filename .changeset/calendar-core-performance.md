---
"@fragiola/calendar": patch
---

Faster drags and drops: the host's zone (`timeZone: "local"`) is read once and again at the engine's midnight refresh, "today", zone and locale checks are cached, so no `Intl` object is built on a hot path. `engine.adapter.attributes` is memoised per part and returns the same record while a part's attributes are the same; a `ViewChange` names its scopes (`focus`, `gesture`, `preview`, `selection`, `layout`), told once per input event, and `engine.adapter.affects(change, part)` says which parts a change may reach.
