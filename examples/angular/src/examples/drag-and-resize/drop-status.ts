import { Component, signal } from "@angular/core";
import * as styles from "./styles";

// The last drop in words, for a screen reader: its text is its own state, so a drop re-renders the
// line, not the calendar.
@Component({
    selector: "example-drag-and-resize-drop-status",
    host: { class: "contents" },
    template: `<p role="status" [class]="styles.status">{{ text() }}</p>`,
})
export class DropStatus {
    protected readonly styles = styles;
    protected readonly text = signal("");

    /** Says what the drop did. */
    show(text: string) {
        this.text.set(text);
    }
}
