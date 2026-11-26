import type { ExampleMeta } from "../meta-types";

export default {
    title: "Day",
    description:
        "One day's time grid: the same parts as a week with one column, stepping a day at a time, with the now line in today's column.",
    category: "basics",
    order: 3,
    features: [
        "TimeGrid",
        "Columns",
        "Column",
        "TimeEvent",
        "view: day",
        "NowIndicator",
    ],
    docs: "/docs/guides/week-and-day-views",
    height: 600,
} satisfies ExampleMeta;
