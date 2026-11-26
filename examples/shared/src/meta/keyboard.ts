import type { ExampleMeta } from "../meta-types";

export default {
    title: "Keyboard",
    description:
        "The whole calendar from the keyboard: roving focus, into a day's events, grab with Space, move and resize with the arrows, announced in a live region of your own.",
    category: "interaction",
    order: 3,
    features: ["onAnnounce", "live region", "keyboard grab", "Shift + arrows"],
    docs: "/docs/guides/keyboard",
    height: 620,
} satisfies ExampleMeta;
