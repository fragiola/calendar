import type { ListLayout } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/** The visible days with their occurrences, empty days left out (a list view's, D11). */
export function useListLayout(): ListLayout {
    const context = useCalendarContext("useListLayout");
    return useCalendarValue(context, () => context.model.get("list"), {
        part: "list",
    });
}
