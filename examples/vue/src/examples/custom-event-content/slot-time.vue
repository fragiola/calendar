<script setup lang="ts">
import { useCalendar } from "@fragiola/calendar-vue";
import { text } from "../_kit/format";
import type { Types } from "./kinds";
import * as styles from "./styles";

const props = defineProps<{ time: string }>();
const { model } = useCalendar<Types>();

function label() {
    return model.get("slot-label-by", {
        time: props.time,
        format: { hour: "numeric" },
    });
}
</script>

<template>
    <span :class="styles.slotTime">{{ text(label() ?? []) }}</span>
</template>
