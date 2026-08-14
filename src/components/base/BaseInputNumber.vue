<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    maxFractionDigits?: number;
  }>(),
  {
    min: undefined,
    max: undefined,
    maxFractionDigits: 0,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

function clamp(value: number) {
  const factor = 10 ** props.maxFractionDigits;
  let next = Math.round(value * factor) / factor;
  if (props.min !== undefined) next = Math.max(props.min, next);
  if (props.max !== undefined) next = Math.min(props.max, next);
  return next;
}

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  const parsed = raw === "" ? 0 : Number(raw);
  emit("update:modelValue", Number.isNaN(parsed) ? 0 : parsed);
}

function onBlur(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value || 0);
  emit("update:modelValue", clamp(raw));
}
</script>

<template>
  <input
    class="base-input-number"
    type="number"
    :value="modelValue"
    :min="min"
    :max="max"
    :step="maxFractionDigits > 0 ? 1 / 10 ** maxFractionDigits : 1"
    @input="onInput"
    @blur="onBlur"
  />
</template>

<style scoped>
.base-input-number {
  width: 100%;
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  background: rgba(9, 15, 26, 0.72);
  color: var(--text-primary);
}

.base-input-number:focus {
  outline: none;
  border-color: rgba(122, 167, 255, 0.55);
}
</style>
