import type { ExampleMeta } from "../meta-types";

export default {
    title: "Team planner",
    description:
        "A team's week: a calendar per person with a panel to show or hide them, a mini month to jump around, drag, resize, select to create, recurring meetings and business hours.",
    category: "apps",
    order: 1,
    features: [
        "every feature",
        "Dialog",
        "AlertDialog",
        "DatePicker",
        "calendar.set-visible",
    ],
    docs: "/docs/getting-started/introduction",
    height: 720,
} satisfies ExampleMeta;
