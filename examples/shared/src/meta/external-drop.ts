import type { ExampleMeta } from "../meta-types";

export default {
    title: "External drop",
    description:
        "Drag tasks from a list onto the calendar, or drop a text file: each becomes an event where it lands.",
    category: "interaction",
    order: 4,
    features: [
        "externalDrop()",
        "draft",
        "onExternalDrop",
        "native drag and drop",
    ],
    docs: "/docs/guides/external-drop",
    height: 620,
} satisfies ExampleMeta;
