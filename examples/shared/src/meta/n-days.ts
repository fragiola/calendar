import type { ExampleMeta } from "../meta-types";

export default {
    title: "N days",
    description:
        "A view of any number of days: three, four or five at a time, picked with ViewButton and stepping by its own length.",
    category: "basics",
    order: 4,
    features: ["ViewButton", "days view", "view.set", "Previous / Next"],
    docs: "/docs/guides/week-and-day-views",
    height: 600,
} satisfies ExampleMeta;
