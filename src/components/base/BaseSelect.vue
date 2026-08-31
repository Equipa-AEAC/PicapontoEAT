<script setup lang="ts">
import { PhCaretDown } from "@phosphor-icons/vue";

withDefaults(
  defineProps<{
    modelValue: unknown;
    options: { label: string; value: unknown }[];
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    placeholder: undefined,
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: unknown];
}>();

function onChange(event: Event) {
  const index = (event.target as HTMLSelectElement).selectedIndex;
  const target = event.target as HTMLSelectElement;
  const raw = target.options[index]?.dataset.value;
  emit("update:modelValue", raw === undefined ? undefined : JSON.parse(raw));
}
</script>

<template>
  <label class="base-select">
    <select class="base-select__control" :disabled="disabled" @change="onChange">
      <option v-if="placeholder" disabled :selected="modelValue === undefined || modelValue === null">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="String(option.value)"
        :data-value="JSON.stringify(option.value)"
        :selected="option.value === modelValue"
      >
        {{ option.label }}
      </option>
    </select>
    <PhCaretDown weight="bold" class="base-select__icon" />
  </label>
</template>

<style scoped>
.base-select {
  position: relative;
  display: inline-flex;
  width: 100%;
}

.base-select__control {
  width: 100%;
  appearance: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 36px 10px 14px;
  background: var(--input);
  color: var(--foreground);
}

.base-select__control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.base-select__control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-select__icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: var(--foreground-secondary);
  pointer-events: none;
}
</style>
