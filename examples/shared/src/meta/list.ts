import type { ExampleMeta } from "../meta-types";

export default {
    title: "List",
    description:
        "An agenda: each day with events under a heading you write, its events as a list, an empty state of your own.",
    category: "basics",
    order: 5,
    features: ["List", "ListDays", "ListDay", "ListEvent", "list-empty"],
    docs: "/docs/guides/list-view",
    height: 560,
} satisfies ExampleMeta;
