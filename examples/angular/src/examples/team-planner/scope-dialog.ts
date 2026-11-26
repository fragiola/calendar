import { Component, input, output } from "@angular/core";
import type { EditScope } from "@fragiola/calendar-angular";
import { Button } from "#/components/atoms/clickable";
import { DIALOG } from "#/components/ui/dialog";
import * as styles from "./styles";

// "This event, the following ones, or all of them?": asked when an occurrence of a series is moved
// or resized (planner.ts stops the edit in a middleware). Each answer is an edit scope (D15).
@Component({
    selector: "example-team-planner-scope-dialog",
    imports: [Button, DIALOG],
    host: { class: "contents" },
    template: `
        <ng-template kitDialog [open]="open()" (openChange)="$event || cancel.emit()">
            <div kitDialogBackdrop></div>
            <kit-dialog-content>
                <div kitDialogHeader>
                    <h2 kitDialogTitle>Change a recurring event</h2>
                    <p kitDialogDescription>This event repeats. Which occurrences change?</p>
                </div>
                <div kitDialogFooter [class]="styles.scopeFooter">
                    <button kitButton variant="outline" kitDialogClose>Cancel</button>
                    <button kitButton variant="outline" (click)="pick.emit('this')">This event</button>
                    <button kitButton variant="outline" (click)="pick.emit('following')">This and following</button>
                    <button kitButton [class]="styles.primary" (click)="pick.emit('all')">All events</button>
                </div>
            </kit-dialog-content>
        </ng-template>
    `,
})
export class ScopeDialog {
    readonly open = input(false);
    readonly pick = output<EditScope>();
    readonly cancel = output();
    protected readonly styles = styles;
}
