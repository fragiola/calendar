<script setup lang="ts">
import { useCalendar } from "@fragiola/calendar-vue";
import { onBeforeUnmount, ref } from "vue";
import { Checkbox } from "#/components/ui/checkbox";
import { Field } from "#/components/ui/field";
import type { Types } from "../_kit/data";
import * as styles from "./styles";

// A person's row: the checkbox follows the model (`calendar-visible`, re-read on each change).
const props = defineProps<{ id: string; title: string }>();
const { model } = useCalendar<Types>();
const isVisible = () => model.is("calendar-visible", { calendarId: props.id });
const visible = ref(isVisible());
onBeforeUnmount(
    model.subscribe(() => {
        visible.value = isVisible();
    }),
);

function toggle(checked: boolean) {
    model.run("calendar.set-visible", {
        calendarId: props.id,
        visible: checked,
    });
}
</script>

<template>
    <li>
        <Field.ChoiceRoot :class="styles.calendarRow(id)">
            <Checkbox.Root
                :id="`planner-calendar-${id}`"
                :checked="visible"
                @checked-change="toggle"
            >
                <Checkbox.Indicator />
            </Checkbox.Root>
            <Field.Label :for="`planner-calendar-${id}`">{{ title }}</Field.Label>
            <span aria-hidden="true" :class="styles.swatch" />
        </Field.ChoiceRoot>
    </li>
</template>
