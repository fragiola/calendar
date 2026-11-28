---
"@fragiola/calendar-react": patch
---

Faster drags and drops: a part reads its attributes again only for the view changes that may reach it (`engine.adapter.affects`), so a preview moving re-renders the preview it enters and leaves and reads no other part; `Calendar.Slot` skips a render whose props are the same, and `Calendar.Slots` calls its function without a component per day, so a drop renders no slot.
