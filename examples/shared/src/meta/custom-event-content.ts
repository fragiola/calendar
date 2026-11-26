import type { ExampleMeta } from "../meta-types";

export default {
    title: "Custom event content",
    description:
        "Events drawn your way: an icon per kind, the calendar's colour, the times, attendees, a cancelled state, all from the event's typed data.",
    category: "basics",
    order: 8,
    features: [
        "Types registry",
        "event data",
        "TimeEvent",
        "className function",
    ],
    docs: "/docs/concepts/typed-data",
    height: 620,
} satisfies ExampleMeta;
