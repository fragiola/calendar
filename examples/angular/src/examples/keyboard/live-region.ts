import { Component, signal } from "@angular/core";
import * as styles from "./styles";

// The engine's announcements in words: the region's text is its own state, so an announcement
// re-renders the region, not the calendar.
@Component({
    selector: "example-keyboard-live-region",
    host: { class: "contents" },
    template: `<div role="status" aria-live="polite" data-testid="announcer" [class]="styles.status">{{ message() }}</div>`,
})
export class LiveRegion {
    protected readonly styles = styles;
    protected readonly message = signal("");

    /** Says an announcement's text. */
    say(text: string) {
        this.message.set(text);
    }
}
