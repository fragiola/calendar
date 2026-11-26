import type { EditScope } from "@fragiola/calendar-react";
import { Clickable } from "#/components/atoms/clickable";
import { Dialog } from "#/components/ui/dialog";
import * as styles from "./styles";

// "This event, the following ones, or all of them?": asked when an occurrence of a series is moved
// or resized (planner.ts stops the edit in a middleware). Each answer is an edit scope (D15).
export function ScopeDialog(props: {
    open: boolean;
    onPick: (scope: EditScope) => void;
    onCancel: () => void;
}) {
    const { open, onPick, onCancel } = props;
    return (
        <Dialog.Root
            open={open}
            onOpenChange={(next) => {
                if (!next) onCancel();
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop />
                <Dialog.Content>
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
                            onClick={() => onPick("this")}
                        >
                            This event
                        </Clickable.Button>
                        <Clickable.Button
                            variant="outline"
                            onClick={() => onPick("following")}
                        >
                            This and following
                        </Clickable.Button>
                        <Clickable.Button
                            className={styles.primary}
                            onClick={() => onPick("all")}
                        >
                            All events
                        </Clickable.Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
