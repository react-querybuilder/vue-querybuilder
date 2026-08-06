<script setup lang="ts">
import type { ActionProps } from 'vue-querybuilder';

/**
 * A custom `addRuleAction` control, passed through `controlElements`.
 *
 * Its only job in this example is to prove that a consumer-supplied control renders during SSR;
 * `ssr-smoke-test.ts` asserts on its label.
 *
 * Step 7 introduces key-named scoped slots, at which point this example switches to passing the
 * control as a `#addRuleAction` slot so that `slotToComponent`'s server path is exercised too.
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
