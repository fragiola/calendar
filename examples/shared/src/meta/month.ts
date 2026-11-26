import type { ExampleMeta } from "../meta-types";

export default {
    title: "Month",
    description:
        "A month you assemble yourself: the title as data, the navigation buttons, weeks of days whose events fit what the day holds.",
    category: "basics",
    order: 1,
    features: [
        "DayGrid",
        "Weeks",
        "Week",
        "Day",
        "DayEvents",
        "Segment",
        "More",
        "useCalendarTitle",
        'dayMaxEvents: "auto"',
    ],
    docs: "/docs/guides/month-view",
    height: 680,
} satisfies ExampleMeta;
