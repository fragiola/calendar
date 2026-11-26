// The entry of @fragiola/calendar-angular/now-indicator: the now indicator feature
// (`nowIndicator()`, the core's) and what shows it: `*calendarNowIndicator` and
// `injectNowPosition`. A calendar that never imports it does not ship them.

export * from "@fragiola/calendar/now-indicator";
export {
    CalendarNowIndicatorDirective,
    type NowIndicatorContext,
    type NowIndicatorState,
} from "./directives/now-indicator.directive";
export { injectNowPosition } from "./inject/inject-now-position";
