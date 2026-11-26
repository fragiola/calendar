// The entry of @fragiola/calendar-angular/constraints: the constraints feature (`constraints()`,
// the core's) and what shows its business hours: `*calendarBusinessHours` and
// `injectBusinessHours`. A calendar that never imports it does not ship them.

export * from "@fragiola/calendar/constraints";
export {
    type BusinessHoursContext,
    type BusinessHoursState,
    CalendarBusinessHoursDirective,
} from "./directives/business-hours.directive";
export { injectBusinessHours } from "./inject/inject-business-hours";
