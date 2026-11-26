import type { ExampleMeta } from "../meta-types";

export default {
    title: "Now indicator",
    description:
        "The current time's line in today's column, moved by the engine's clock, with past slots dimmed.",
    category: "interaction",
    order: 6,
    features: ["nowIndicator()", "NowIndicator", "data-past"],
    docs: "/docs/guides/week-and-day-views",
    height: 600,
} satisfies ExampleMeta;
