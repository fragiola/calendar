import type { ExampleMeta } from "../meta-types";

export default {
    title: "Event sources",
    description:
        "Events loaded from a fake server with latency: the app fetches the ranges the feature asks for and shows a loading state.",
    category: "data",
    order: 3,
    features: [
        "eventSources()",
        "ranges-to-fetch",
        "event-sources.receive",
        "set-loading",
    ],
    docs: "/docs/guides/loading-events",
    height: 600,
} satisfies ExampleMeta;
