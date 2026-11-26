<script setup lang="ts">
import { useCalendar } from "@fragiola/calendar-vue";
import { ref } from "vue";
import { SegmentedControl } from "#/components/ui/segmented-control";
import type { Types } from "../_kit/data";
import * as styles from "./styles";

const LOCALES = [
    { locale: "en-US", label: "English (US)" },
    { locale: "en-GB", label: "English (UK)" },
    { locale: "de-DE", label: "Deutsch" },
    { locale: "ja-JP", label: "日本語" },
] as const;

const RULES = [
    { rule: "locale", label: "Locale weeks" },
    { rule: "iso", label: "ISO weeks" },
] as const;

// The locale and the week-number rule: app state that each runs one `settings.set`.
const { model } = useCalendar<Types>();
const locale = ref<string | null>(model.state.settings.locale);
const rule = ref<string | null>(model.state.settings.weekNumbers);

function setLocale(next: unknown) {
    if (typeof next !== "string" || !next) return;
    locale.value = next;
    model.run("settings.set", { settings: { locale: next } });
}

function setRule(next: unknown) {
    if (next !== "iso" && next !== "locale") return;
    rule.value = next;
    model.run("settings.set", { settings: { weekNumbers: next } });
}
</script>

<template>
    <div :class="styles.settings">
        <SegmentedControl.Root
            aria-label="Locale"
            :model-value="locale"
            @update:model-value="setLocale"
        >
            <SegmentedControl.Item
                v-for="option in LOCALES"
                :key="option.locale"
                :value="option.locale"
                >{{ option.label }}</SegmentedControl.Item
            >
        </SegmentedControl.Root>
        <SegmentedControl.Root
            aria-label="Week numbers"
            :model-value="rule"
            @update:model-value="setRule"
        >
            <SegmentedControl.Item
                v-for="option in RULES"
                :key="option.rule"
                :value="option.rule"
                >{{ option.label }}</SegmentedControl.Item
            >
        </SegmentedControl.Root>
    </div>
</template>
