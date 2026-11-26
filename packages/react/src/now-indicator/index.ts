// The entry of @fragiola/calendar-react/now-indicator: the now indicator feature
// (`nowIndicator()`, the core's) and what shows it: `NowIndicator` and `useNowPosition`. A
// calendar that never imports it does not ship them.

export * from "@fragiola/calendar/now-indicator";
export {
    NowIndicator,
    type NowIndicatorProps,
    type NowIndicatorState,
} from "./now-indicator";
export { useNowPosition } from "./use-now-position";
