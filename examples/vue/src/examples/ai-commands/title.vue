<script setup lang="ts">
import { useCalendarTitle } from "@fragiola/calendar-vue";
import { text } from "../_kit/format";
import * as styles from "./styles";

const title = useCalendarTitle();
</script>

<template>
    <h2 :class="styles.title">{{ text(title) }}</h2>
</template>
