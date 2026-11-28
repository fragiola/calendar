import { Component, effect, signal } from "@angular/core";
import {
    type EditScope,
    injectCalendar,
    veto,
} from "@fragiola/calendar-angular";
import type { recurrence } from "@fragiola/calendar-angular/recurrence";
import { Button } from "#/components/atoms/clickable";
import { DIALOG } from "#/components/ui/dialog";
import type { Types } from "../_kit/data";
import * as styles from "./styles";

/** A move or a resize of an occurrence of a series, waiting for the user's scope. */
interface Pending {
    command: "event.move" | "event.resize";
    payload: Record<string, unknown>;
    title: string;
}

/** The `meta` of a command the user already scoped: the middleware lets it through. */
const SCOPED = { scoped: true } as const;

const SCOPES: { scope: EditScope; label: string }[] = [
    { scope: "this", label: "This event" },
    { scope: "following", label: "This and following events" },
    { scope: "all", label: "All events" },
];

// The dialog holds the edit waiting for its scope: asking re-renders the dialog, not the calendar.
@Component({
    selector: "example-recurring-events-scope-dialog",
    imports: [Button, DIALOG],
    host: { class: "contents" },
    template: `
        <ng-template kitDialog [open]="pending() !== null" (openChange)="onOpenChange($event)">
            <div kitDialogBackdrop [class]="styles.dialogBackdrop"></div>
            <kit-dialog-content [class]="styles.dialog">
                <div kitDialogHeader>
                    <h2 kitDialogTitle>Edit recurring event</h2>
                    <p kitDialogDescription>“{{ pending()?.title ?? "" }}” repeats. Change which events?</p>
                </div>
                <div kitDialogBody [class]="styles.scopes">
                    @for (option of SCOPES; track option.scope) {
                        <button kitButton variant="outline" [class]="styles.scope" (click)="choose(option.scope)">{{ option.label }}</button>
                    }
                </div>
                <div kitDialogFooter>
                    <button kitButton variant="ghost" kitDialogClose>Cancel</button>
                </div>
            </kit-dialog-content>
        </ng-template>
    `,
})
export class ScopeDialog {
    protected readonly styles = styles;
    protected readonly SCOPES = SCOPES;
    protected readonly pending = signal<Pending | null>(null);
    private readonly model = injectCalendar<
        Types,
        readonly [ReturnType<typeof recurrence>]
    >().model;

    constructor() {
        effect((onCleanup) => {
            onCleanup(
                this.model().use((ctx, next) => {
                    if (
                        ctx.dryRun ||
                        ctx.meta?.scoped === true ||
                        (ctx.command !== "event.move" &&
                            ctx.command !== "event.resize")
                    ) {
                        return next();
                    }
                    const { eventId, occurrenceId } = ctx.payload;
                    const event = ctx.get("event-by", { id: eventId });
                    if (
                        occurrenceId === undefined ||
                        event?.recurrence === undefined
                    ) {
                        return next();
                    }
                    this.pending.set({
                        command: ctx.command,
                        payload: { ...ctx.payload },
                        title: event.title,
                    });
                    return veto("waiting for the user's scope");
                }),
            );
        });
    }

    protected choose(scope: EditScope) {
        const pending = this.pending();
        if (!pending) return;
        this.model().run(
            pending.command,
            { ...pending.payload, scope } as never,
            { meta: SCOPED },
        );
        this.pending.set(null);
    }

    protected onOpenChange(open: boolean) {
        if (!open) this.pending.set(null);
    }
}
