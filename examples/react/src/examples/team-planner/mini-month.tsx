import { useCalendar, useCalendarView } from "@fragiola/calendar-react";
import { Calendar as DatePicker } from "#/components/ui/calendar";
import type { Types } from "../_kit/data";

/** A `YYYY-MM-DD` day as the date picker's plain date. */
function plainDate(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 };
}

// A mini month to jump around: Fragiola UI's date picker (also named `Calendar`, so imported as
// `DatePicker`). Its plain dates are the calendar's (`{ year, month, day }`): a picked day goes
// straight to `view.go-to`.
export function MiniMonth() {
    const { model } = useCalendar<Types>();
    const view = useCalendarView();
    return (
        <DatePicker.Template.Simple
            aria-label="Go to a date"
            value={plainDate(view.anchorDate)}
            onValueChange={(date) => {
                if (date) model.run("view.go-to", { date });
            }}
        />
    );
}
