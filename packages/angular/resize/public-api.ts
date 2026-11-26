// The entry of @fragiola/calendar-angular/resize: the resize feature (`resize()`, the core's), its
// `*calendarResizeHandle`, the preview a resize shows (`*calendarDragPreview`, `injectDragPreview`)
// and the root's drop event (`[calendarRoot][calendarResize]`'s `(eventDrop)`), also in
// `/drag-and-drop`. A calendar that never imports it does not ship them.

export * from "@fragiola/calendar/resize";
export {
    CalendarDragAndDropRootDirective,
    CalendarDragPreviewDirective,
    type DragPreviewContext,
    type DragPreviewState,
    injectDragPreview,
} from "@fragiola/calendar-angular/drag-and-drop";
export {
    CalendarResizeHandleDirective,
    type ResizeHandleContext,
    type ResizeHandleState,
} from "./directives/resize-handle.directive";
