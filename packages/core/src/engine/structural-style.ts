// The one place the core writes a style (D18): `touch-action: none` on the events a drag feature
// can move or resize, without which a touch browser takes the press for its own scroll and cancels
// the gesture (`pointercancel`). Only this property; the core guard allows `.style` in this file
// alone and pins what it writes.

/** Keeps the browser's own touch panning off an event a drag feature handles. */
export function writeEventTouchAction(element: HTMLElement): void {
    element.style.setProperty("touch-action", "none");
}

/** Removes what {@link writeEventTouchAction} wrote. */
export function clearEventTouchAction(element: HTMLElement): void {
    element.style.removeProperty("touch-action");
}
