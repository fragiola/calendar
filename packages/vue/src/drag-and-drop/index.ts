// The entry of @fragiola/calendar-vue/drag-and-drop: the drag and drop feature (`dragAndDrop()`,
// the core's) and what shows a drag: `DragPreview` and `useDragPreview`. A calendar that never
// imports it does not ship them.

export * from "@fragiola/calendar/drag-and-drop";
export {
    DragPreview,
    type DragPreviewProps,
    type DragPreviewSlots,
    type DragPreviewState,
} from "./drag-preview";
export { useDragPreview } from "./use-drag-preview";
