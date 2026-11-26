import { useCalendar } from "@fragiola/calendar-react";
import { useSyncExternalStore } from "react";
import { Checkbox } from "#/components/ui/checkbox";
import { Field } from "#/components/ui/field";
import { CALENDARS, type Types } from "../_kit/data";
import * as styles from "./styles";

// The calendars panel: one checkbox per person, showing or hiding their events with
// `calendar.set-visible` (model state: an AI or a server could do the same).
export function CalendarsPanel() {
    return (
        <section
            aria-labelledby="planner-calendars"
            className={styles.panelSection}
        >
            <h3 id="planner-calendars" className={styles.panelHeading}>
                Calendars
            </h3>
            <ul className={styles.calendarList}>
                {CALENDARS.map((calendar) => (
                    <CalendarToggle
                        key={calendar.id}
                        id={calendar.id ?? ""}
                        title={calendar.title}
                    />
                ))}
            </ul>
        </section>
    );
}

function CalendarToggle({ id, title }: { id: string; title: string }) {
    const { model } = useCalendar<Types>();
    const visible = useSyncExternalStore(model.subscribe, () =>
        model.is("calendar-visible", { calendarId: id }),
    );
    return (
        <li>
            <Field.ChoiceRoot className={styles.calendarRow(id)}>
                <Checkbox.Root
                    id={`planner-calendar-${id}`}
                    checked={visible}
                    onCheckedChange={(checked) =>
                        model.run("calendar.set-visible", {
                            calendarId: id,
                            visible: checked === true,
                        })
                    }
                >
                    <Checkbox.Indicator />
                </Checkbox.Root>
                <Field.Label htmlFor={`planner-calendar-${id}`}>
                    {title}
                </Field.Label>
                <span aria-hidden className={styles.swatch} />
            </Field.ChoiceRoot>
        </li>
    );
}
