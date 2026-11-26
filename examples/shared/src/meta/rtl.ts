import type { ExampleMeta } from "../meta-types";

export default {
    title: "Right to left",
    description:
        "A week in Arabic, right to left: the columns run from the right, the arrows follow the reading order, drags follow the pointer.",
    category: "basics",
    order: 11,
    features: ["dir=rtl", "logical properties", "locale"],
    docs: "/docs/guides/rtl",
    height: 600,
} satisfies ExampleMeta;
