<script setup lang="ts">
import type { ActionProps } from 'vue-querybuilder';

/**
 * A custom `addRuleAction` control, rendered from a `#addRuleAction` scoped slot.
 *
 * Its job in this example is to prove that a consumer-supplied control renders during SSR — and,
 * because it arrives as a slot, that `slotToComponent`'s server path works too.
 * `ssr-smoke-test.ts` asserts on its label.
 */
defineOptions({ name: 'CustomAddRuleAction', inheritAttrs: false });

const props = defineProps<ActionProps>();
</script>

<template>
  <button
    type="button"
    :data-testid="props.testID"
    :disabled="props.disabled"
    :class="props.className"
    :title="props.title"
    @click="e => props.handleOnClick(e)">
    Custom Add Rule
  </button>
</template>
