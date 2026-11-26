// The entry of @fragiola/calendar-angular/selection: the selection feature (`selection()`, the
// core's), what shows it (`*calendarSelection`, `injectSelection`) and the root's selection event
// (`[calendarRoot][calendarSelection]`'s `(rangeSelect)`). A calendar that never imports it does
// not ship them.

export * from "@fragiola/calendar/selection";
export {
    CalendarSelectionDirective,
    type SelectionContext,
    type SelectionState,
} from "./directives/selection.directive";
export { CalendarSelectionRootDirective } from "./directives/selection-root.directive";
export {
    type CalendarSelection,
    injectSelection,
} from "./inject/inject-selection";
