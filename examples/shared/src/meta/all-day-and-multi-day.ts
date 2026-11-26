import type { ExampleMeta } from "../meta-types";

export default {
    title: "All-day and multi-day events",
    description:
        "All-day events, events spanning several days and weeks, and timed events crossing midnight, in a month and in a week's all-day row.",
    category: "basics",
    order: 6,
    features: [
        "AllDayRow",
        "Segment",
        "continuesBefore",
        "continuesAfter",
        "nextDayThreshold",
    ],
    docs: "/docs/guides/month-view",
    height: 620,
} satisfies ExampleMeta;
