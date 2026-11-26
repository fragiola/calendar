import type { ExampleMeta } from "../meta-types";

export default {
    title: "Hidden days and slot range",
    description:
        "A working week: weekends hidden, the grid from 07:00 to 20:00, in 15-minute slots.",
    category: "basics",
    order: 12,
    features: ["hiddenDays", "slotMinTime", "slotMaxTime", "slotDuration"],
    docs: "/docs/guides/week-and-day-views",
    height: 600,
} satisfies ExampleMeta;
