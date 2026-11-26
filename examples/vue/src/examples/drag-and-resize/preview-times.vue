<script setup lang="ts">
import { computed } from "vue";
import * as styles from "./styles";

/** The preview's start as a wall-clock time (the app's formatting). */
const props = defineProps<{ start: string }>();
const time = computed(() =>
    new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
    }).format(Date.parse(props.start)),
);
</script>

<template>
    <span :class="styles.previewTime">{{ time }}</span>
</template>
