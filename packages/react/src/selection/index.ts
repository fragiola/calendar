// The entry of @fragiola/calendar-react/selection: the selection feature (`selection()`, the
// core's) and what shows it: `Selection` (the range's highlight) and `useSelection`. A calendar
// that never imports it does not ship them.

export * from "@fragiola/calendar/selection";
export {
    Selection,
    type SelectionProps,
    type SelectionState,
} from "./selection";
export { type CalendarSelection, useSelection } from "./use-selection";
