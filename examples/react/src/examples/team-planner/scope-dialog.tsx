import { type EditScope, useCalendar } from "@fragiola/calendar-react";
import { useEffect, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Dialog } from "#/components/ui/dialog";
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
export function ScopeDialog() {
    const { model } = useCalendar<Types, typeof features>();
    const [pending, setPending] = useState<PendingEdit | null>(null);

    // an edit of a recurring event waits for its scope (planner.ts)
    useEffect(() => model.use(askForScope(setPending)), [model]);

    const pick = (scope: EditScope) => {
        if (pending) runWithScope(model, pending, scope);
        setPending(null);
    };

    return (
        <Dialog.Root
            open={pending !== null}
            onOpenChange={(next) => {
                if (!next) setPending(null);
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop className={styles.dialogBackdrop} />
                <Dialog.Content className={styles.dialog}>
                    <Dialog.Header>
                        <Dialog.Title>Change a recurring event</Dialog.Title>
                        <Dialog.Description>
                            This event repeats. Which occurrences change?
                        </Dialog.Description>
                    </Dialog.Header>
                    <Dialog.Footer className={styles.scopeFooter}>
                        <Dialog.Close
                            render={<Clickable.Button variant="outline" />}
                        >
                            Cancel
                        </Dialog.Close>
                        <Clickable.Button
                            variant="outline"
                            onClick={() => pick("this")}
                        >
                            This event
                        </Clickable.Button>
                        <Clickable.Button
                            variant="outline"
                            onClick={() => pick("following")}
                        >
                            This and following
                        </Clickable.Button>
                        <Clickable.Button
                            className={styles.primary}
                            onClick={() => pick("all")}
                        >
                            All events
                        </Clickable.Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
