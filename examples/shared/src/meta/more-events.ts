import type { ExampleMeta } from "../meta-types";

export default {
    title: "More events",
    description:
        "A busy month that shows two events a day: “+N more” opens Fragiola UI's popover with the day's hidden events, and is reachable from the keyboard.",
    category: "basics",
    order: 7,
    features: ["More", "dayMaxEvents", "onMoreClick", "Popover"],
    docs: "/docs/guides/month-view",
    height: 640,
} satisfies ExampleMeta;
