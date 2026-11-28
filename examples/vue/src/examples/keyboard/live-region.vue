<script setup lang="ts">
import { ref } from "vue";
import * as styles from "./styles";

// The engine's announcements in words: the region's text is its own state, so an announcement
// re-renders the region, not the calendar.
const message = ref("");

/** Says an announcement's text. */
function say(text: string) {
    message.value = text;
}

defineExpose({ say });
</script>

<template>
    <div
        role="status"
        aria-live="polite"
        data-testid="announcer"
        :class="styles.status"
    >{{ message }}</div>
</template>
