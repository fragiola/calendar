# calendar

`@fragiola/calendar` is a headless, accessible event calendar for the web, part of the
[Fragiola](https://fragiola.com) ecosystem. A framework-free core holds the events, the visible
range and the views (month, week, day, list) behind the Fragiola model API, and thin adapters for
React, Vue and Angular render them as composable primitives with no CSS. Scheduling interactions
(selecting a range, moving and resizing events by pointer and keyboard) run through the same
command bus, so an app, a back-end or an AI can drive the calendar.
