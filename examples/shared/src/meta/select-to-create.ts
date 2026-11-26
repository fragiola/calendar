import type { ExampleMeta } from "../meta-types";

export default {
    title: "Select to create",
    description:
        "Drag over the slots (or Shift + arrows) to select a range; the selection opens an event editor in a dialog, and saving runs event.add.",
    category: "interaction",
    order: 1,
    features: ["selection()", "Selection", "onSelect", "event.add", "Dialog"],
    docs: "/docs/guides/selecting-ranges",
    height: 620,
} satisfies ExampleMeta;
