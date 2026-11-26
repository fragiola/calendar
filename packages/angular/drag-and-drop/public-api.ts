// The entry of @fragiola/calendar-angular/drag-and-drop: the drag and drop feature
// (`dragAndDrop()`, the core's), what shows a drag (`*calendarDragPreview`, `injectDragPreview`)
// and the root's drop event (`[calendarRoot][calendarDragAndDrop]`'s `(eventDrop)`). A calendar
// that never imports it does not ship them.

export * from "@fragiola/calendar/drag-and-drop";
export { CalendarDragAndDropRootDirective } from "./directives/drag-and-drop-root.directive";
export {
    CalendarDragPreviewDirective,
    type DragPreviewContext,
    type DragPreviewState,
} from "./directives/drag-preview.directive";
export { injectDragPreview } from "./inject/inject-drag-preview";
