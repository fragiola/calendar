import type { SelectionRange } from "@fragiola/calendar-react";
import { type FormEvent, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { Dialog } from "#/components/ui/dialog";
import { Field } from "#/components/ui/field";
import { Select } from "#/components/ui/select";
import { CALENDARS } from "../_kit/data";
import * as styles from "./styles";

/** The calendars a new event may go to, for the select. */
const CALENDAR_ITEMS = Object.fromEntries(
    CALENDARS.map((calendar) => [calendar.id ?? "", calendar.title]),
);

/** What the editor saves: a title and a calendar for the selected range. */
export interface NewEvent {
    title: string;
    calendarId: string;
    range: SelectionRange;
}

// The event editor: a dialog of the app's (the package ships none), opened by a selected range.
// Saving runs `event.add` (index.tsx); closing it clears the selection.
export function EventEditor(props: {
    range: SelectionRange | null;
    when: string;
    onSave: (event: NewEvent) => void;
    onClose: () => void;
}) {
    const { range, when, onSave, onClose } = props;
    const [title, setTitle] = useState("");
    const [calendarId, setCalendarId] = useState("ada");
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!range) return;
        onSave({ title: title.trim() || "New event", calendarId, range });
        setTitle("");
    };
    return (
        <Dialog.Root
            open={range !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop />
                <Dialog.Content>
                    <form onSubmit={submit} className={styles.form}>
                        <Dialog.Header>
                            <Dialog.Title>New event</Dialog.Title>
                            <Dialog.Description>{when}</Dialog.Description>
                        </Dialog.Header>
                        <Dialog.Body>
                            <Field.Root>
                                <Field.Label>Title</Field.Label>
                                <Field.Row>
                                    <Field.Body>
                                        <Input
                                            autoFocus
                                            value={title}
                                            placeholder="New event"
                                            onChange={(event) =>
                                                setTitle(event.target.value)
                                            }
                                        />
                                    </Field.Body>
                                </Field.Row>
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Calendar</Field.Label>
                                <Select.Root
                                    items={CALENDAR_ITEMS}
                                    value={calendarId}
                                    onValueChange={(value) => {
                                        if (typeof value === "string")
                                            setCalendarId(value);
                                    }}
                                >
                                    <Select.Trigger>
                                        <Select.Value />
                                    </Select.Trigger>
                                    <Select.Content>
                                        {CALENDARS.map((calendar) => (
                                            <Select.Item
                                                key={calendar.id}
                                                value={calendar.id ?? ""}
                                            >
                                                {calendar.title}
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Field.Root>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.Close
                                render={<Clickable.Button variant="outline" />}
                            >
                                Cancel
                            </Dialog.Close>
                            <Clickable.Button
                                type="submit"
                                className={styles.primary}
                            >
                                Save
                            </Clickable.Button>
                        </Dialog.Footer>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
