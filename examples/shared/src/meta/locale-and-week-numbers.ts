import type { ExampleMeta } from "../meta-types";

export default {
    title: "Locale and week numbers",
    description:
        "The same month in several locales: their first day of the week, their weekday names and their ISO or local week numbers.",
    category: "basics",
    order: 9,
    features: [
        "locale",
        "firstDayOfWeek",
        "weekNumbers",
        "WeekNumber",
        "settings.set",
    ],
    docs: "/docs/guides/locales-and-week-numbers",
    height: 620,
} satisfies ExampleMeta;
