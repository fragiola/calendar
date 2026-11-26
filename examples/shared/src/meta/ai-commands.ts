import type { ExampleMeta } from "../meta-types";

export default {
    title: "AI commands",
    description:
        "The command catalogue as tool definitions, and a scripted assistant that plans a week by running dispatch.",
    category: "data",
    order: 6,
    features: ["commands", "JSON Schema", "dispatch", "model.check"],
    docs: "/docs/guides/ai-and-automation",
    height: 640,
} satisfies ExampleMeta;
