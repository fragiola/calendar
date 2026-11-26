import type { ExampleMeta } from "../meta-types";

export default {
    title: "Drag and resize",
    description:
        "Move events across days and between the all-day row and the time grid, resize them from either edge, with a preview of where they land.",
    category: "interaction",
    order: 2,
    features: [
        "dragAndDrop()",
        "resize()",
        "DragPreview",
        "ResizeHandle",
        "onEventDrop",
    ],
    docs: "/docs/guides/drag-and-drop",
    height: 620,
} satisfies ExampleMeta;
