import type { ExampleMeta } from "../meta-types";

export default {
    title: "Time zones",
    description:
        "A display-zone switcher, events written in other zones, and the weekend daylight saving time ends in New York.",
    category: "basics",
    order: 10,
    features: ["timeZone", "event timeZone", "settings.set", "DST"],
    docs: "/docs/guides/time-zones",
    height: 620,
} satisfies ExampleMeta;
