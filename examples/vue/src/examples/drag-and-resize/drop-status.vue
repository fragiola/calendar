<script setup lang="ts">
import { ref } from "vue";
import * as styles from "./styles";

// The last drop in words, for a screen reader: its text is its own state, so a drop re-renders the
// line, not the calendar.
const text = ref("");

/** Says what the drop did. */
function show(next: string) {
    text.value = next;
}

defineExpose({ show });
</script>

<template>
    <p role="status" :class="styles.status">{{ text }}</p>
</template>
