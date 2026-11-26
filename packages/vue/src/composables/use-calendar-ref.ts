import type {
    AnyTypes,
    CalendarFeatures,
    CalendarTypes,
} from "@fragiola/calendar";
import { type CalendarRef, createCalendarRef } from "./create-calendar-ref";

/**
 * A calendar ref for this component: pass it as a `Calendar.Root`'s `calendar-ref`, and read
 * `calendar.value` in the template (a toolbar next to the calendar, which re-renders when the root
 * mounts) or in handlers. A template does not unwrap a calendar ref: it reads `calendar.value`, as
 * a script does.
 *
 * ```vue
 * <script setup lang="ts">
 * const calendar = useCalendarRef<Types>();
 * </script>
 * <template>
 *     <button @click="calendar.value?.model.run('view.next', {})">Next</button>
 *     <Calendar.Root :calendar-ref="calendar">…</Calendar.Root>
 * </template>
 * ```
 */
export function useCalendarRef<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
>(): CalendarRef<T, F> {
    return createCalendarRef<T, F>();
}
