import type { ExampleMeta } from "../meta-types";

export default {
    title: "Save and restore",
    description:
        "The calendar's JSON saved to local storage and restored on reload, with the view it was on.",
    category: "data",
    order: 4,
    features: ["calendar-json", "includeView", "createCalendarModel"],
    docs: "/docs/guides/persistence",
    height: 600,
} satisfies ExampleMeta;
