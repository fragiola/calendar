import type { ExampleMeta } from "../meta-types";

export default {
    title: "Undo and redo",
    description:
        "Undo and redo every change of the events, from buttons and Ctrl+Z, with an undo manager written as app code.",
    category: "data",
    order: 5,
    features: ["model.subscribe", "event.set-all", "undo manager"],
    docs: "/docs/guides/undo-redo",
    height: 600,
} satisfies ExampleMeta;
