// The entry of @fragiola/calendar-react/constraints: the constraints feature (`constraints()`, the
// core's) and what shows its business hours: `BusinessHours` and `useBusinessHours`. A calendar
// that never imports it does not ship them.

export * from "@fragiola/calendar/constraints";
export {
    BusinessHours,
    type BusinessHoursProps,
    type BusinessHoursState,
} from "./business-hours";
export { useBusinessHours } from "./use-business-hours";
