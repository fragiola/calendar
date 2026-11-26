import { Component, input, output, signal } from "@angular/core";
import type { SelectionRange } from "@fragiola/calendar-angular";
import { Button } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { DIALOG } from "#/components/ui/dialog";
import { FIELD_PARTS } from "#/components/ui/field";
import { SELECT } from "#/components/ui/select";
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
// Saving emits `save` (index.ts runs `event.add`); closing it clears the selection. The title
// takes the focus as it opens (`autofocus`), not its first button (Close).
@Component({
    selector: "example-team-planner-event-editor",
    imports: [Button, DIALOG, FIELD_PARTS, Input, SELECT],
    host: { class: "contents" },
    template: `
        <ng-template kitDialog [open]="range() !== null" (openChange)="onOpenChange($event)">
            <div kitDialogBackdrop></div>
            <kit-dialog-content>
                <form [class]="styles.form" (submit)="$event.preventDefault(); submit()">
                    <div kitDialogHeader>
                        <h2 kitDialogTitle>New event</h2>
                        <p kitDialogDescription>{{ when() }}</p>
                    </div>
                    <div kitDialogBody>
                        <div kitField>
                            <label kitFieldLabel>Title</label>
                            <div kitFieldRow>
                                <div kitFieldBody>
                                    <input kitInput autofocus [(value)]="title" placeholder="New event" />
                                </div>
                            </div>
                        </div>
                        <div kitField>
                            <label kitFieldLabel>Calendar</label>
                            <ng-container kitSelect [items]="CALENDAR_ITEMS" [(value)]="calendarId">
                                <button kitSelectTrigger><span kitSelectValue></span></button>
                                <kit-select-content>
                                    @for (calendar of CALENDARS; track calendar.id) {
                                        <div kitSelectItem [value]="calendar.id ?? ''">{{ calendar.title }}</div>
                                    }
                                </kit-select-content>
                            </ng-container>
                        </div>
                    </div>
                    <div kitDialogFooter>
                        <button kitButton variant="outline" kitDialogClose>Cancel</button>
                        <button kitButton type="submit" [class]="styles.primary">Save</button>
                    </div>
                </form>
            </kit-dialog-content>
        </ng-template>
    `,
})
export class EventEditor {
    readonly range = input<SelectionRange | null>(null);
    readonly when = input("");
    readonly save = output<NewEvent>();
    readonly closed = output();
    protected readonly styles = styles;
    protected readonly CALENDARS = CALENDARS;
    protected readonly CALENDAR_ITEMS = CALENDAR_ITEMS;
    protected readonly title = signal("");
    protected readonly calendarId = signal<string | null>("ada");

    protected submit() {
        const range = this.range();
        if (!range) return;
        this.save.emit({
            title: this.title().trim() || "New event",
            calendarId: this.calendarId() ?? "ada",
            range,
        });
        this.title.set("");
    }

    protected onOpenChange(open: boolean) {
        if (!open) this.closed.emit();
    }
}
