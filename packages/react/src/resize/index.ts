// The entry of @fragiola/calendar-react/resize: the resize feature (`resize()`, the core's), its
// `ResizeHandle`, and the preview a resize shows (`DragPreview`, `useDragPreview`, also in
// `/drag-and-drop`). A calendar that never imports it does not ship them.

export * from "@fragiola/calendar/resize";
export {
    DragPreview,
    type DragPreviewProps,
    type DragPreviewState,
} from "../drag-and-drop/drag-preview";
export { useDragPreview } from "../drag-and-drop/use-drag-preview";
export {
    ResizeHandle,
    type ResizeHandleProps,
    type ResizeHandleState,
} from "./resize-handle";
