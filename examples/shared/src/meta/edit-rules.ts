import type { ExampleMeta } from "../meta-types";

export default {
    title: "Edit rules",
    description:
        "Read-only calendars, locked events and a middleware that vetoes moves into the past: refused drops show no preview.",
    category: "interaction",
    order: 5,
    features: [
        "editable",
        "startEditable",
        "middleware",
        "refused",
        "model.check",
    ],
    docs: "/docs/concepts/model-and-commands",
    height: 620,
} satisfies ExampleMeta;
