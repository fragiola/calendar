import type { ExampleMeta } from "../meta-types";

export default {
    title: "Week",
    description:
        "A week's time grid: the all-day row, a row per slot with its label, and each day's events placed by their times over the rows.",
    category: "basics",
    order: 2,
    features: [
        "TimeGrid",
        "ColumnHeaders",
        "AllDayRow",
        "Scroller",
        "SlotRows",
        "Columns",
        "Column",
        "TimeEvent",
        "useDayHeader",
    ],
    docs: "/docs/guides/week-and-day-views",
    height: 640,
} satisfies ExampleMeta;
