<script setup lang="ts">
import * as styles from "./styles";

const KEYS = [
    ["Arrows", "move"],
    ["Enter", "into a slot's events"],
    ["Space", "grab"],
    ["Shift + arrows", "resize, or select"],
    ["Enter", "drop"],
    ["Escape", "cancel"],
] as const;
</script>

<template>
    <ul aria-label="Keys" :class="styles.keys">
        <li v-for="[keys, what] in KEYS" :key="`${keys} ${what}`"><kbd :class="styles.key">{{ keys }}</kbd> {{ what }}</li>
    </ul>
</template>
