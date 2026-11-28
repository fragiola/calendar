import type { ListLayout } from "@fragiola/calendar";
import type { ComputedRef } from "vue";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/** The visible days with their occurrences, empty days left out (a list view's, D11), a computed. */
export function useListLayout(): ComputedRef<ListLayout> {
    const context = useCalendarContext("useListLayout");
    return useCalendarValue(context, () => context.model.get("list"), {
        part: "list",
    });
}
