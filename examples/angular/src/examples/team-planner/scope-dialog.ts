import { Component, effect, signal } from "@angular/core";
import { type EditScope, injectCalendar } from "@fragiola/calendar-angular";
import { Button } from "#/components/atoms/clickable";
import { DIALOG } from "#/components/ui/dialog";
import type { Types } from "../_kit/data";
import {
    askForScope,
    type features,
    type PendingEdit,
    runWithScope,
} from "./planner";
import * as styles from "./styles";

// "This event, the following ones, or all of them?": asked when an occurrence of a series is moved
// or resized (planner.ts stops the edit in a middleware). Each answer is an edit scope (D15). The
// dialog holds the waiting edit itself: asking re-renders the dialog, not the planner.
@Component({
    selector: "example-team-planner-scope-dialog",
    imports: [Button, DIALOG],
    host: { class: "contents" },
    template: `
        <ng-template kitDialog [open]="pending() !== null" (openChange)="$event || pending.set(null)">
            <div kitDialogBackdrop [class]="styles.dialogBackdrop"></div>
            <kit-dialog-content [class]="styles.dialog">
                <div kitDialogHeader>
                    <h2 kitDialogTitle>Change a recurring event</h2>
                    <p kitDialogDescription>This event repeats. Which occurrences change?</p>
                </div>
                <div kitDialogFooter [class]="styles.scopeFooter">
                    <button kitButton variant="outline" kitDialogClose>Cancel</button>
                    <button kitButton variant="outline" (click)="pick('this')">This event</button>
                    <button kitButton variant="outline" (click)="pick('following')">This and following</button>
                    <button kitButton [class]="styles.primary" (click)="pick('all')">All events</button>
                </div>
            </kit-dialog-content>
        </ng-template>
    `,
})
export class ScopeDialog {
    protected readonly styles = styles;
    protected readonly pending = signal<PendingEdit | null>(null);
    private readonly model = injectCalendar<Types, typeof features>().model;

    constructor() {
        // an edit of a recurring event waits for its scope (planner.ts)
        effect((onCleanup) => {
            onCleanup(
                this.model().use(askForScope((edit) => this.pending.set(edit))),
            );
        });
    }

    protected pick(scope: EditScope) {
        const pending = this.pending();
        if (pending) runWithScope(this.model(), pending, scope);
        this.pending.set(null);
    }
}
