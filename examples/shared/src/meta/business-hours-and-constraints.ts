import type { ExampleMeta } from "../meta-types";

export default {
    title: "Business hours and constraints",
    description:
        "Business hours shaded in the grid, events kept inside them, and a calendar whose events may not overlap.",
    category: "data",
    order: 2,
    features: [
        "constraints()",
        "BusinessHours",
        "businessHours",
        "eventConstraint",
        "overlap",
    ],
    docs: "/docs/guides/constraints-and-business-hours",
    height: 620,
} satisfies ExampleMeta;
