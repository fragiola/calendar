<script setup lang="ts">
import { useCalendar } from "@fragiola/calendar-vue";
import type { Types } from "../_kit/data";
import { text } from "../_kit/format";
import * as styles from "./styles";

defineProps<{ time: string }>();
const { model } = useCalendar<Types>();
</script>

<template>
    <span :class="styles.slotTime">{{
        text(
            model.get("slot-label-by", {
                time,
                format: { hour: "numeric" },
            }) ?? [],
        )
    }}</span>
</template>
