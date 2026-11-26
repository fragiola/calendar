import type { ExampleMeta } from "../meta-types";

export default {
    title: "Recurring events",
    description:
        "Weekly and monthly series: dragging an occurrence asks whether to change this event, the following ones or all of them.",
    category: "data",
    order: 1,
    features: [
        "recurrence()",
        "RRULE",
        "edit scopes",
        "AlertDialog",
        "event.move",
    ],
    docs: "/docs/guides/recurring-events",
    height: 640,
} satisfies ExampleMeta;
