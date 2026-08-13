<script setup lang="ts">
import { PhCheck } from "@phosphor-icons/vue";

defineProps<{
  modelValue: boolean;
  label?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();
</script>

<template>
  <label class="base-checkbox" :class="{ 'base-checkbox--disabled': disabled }">
    <input
      type="checkbox"
      class="base-checkbox__input"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="base-checkbox__box">
      <PhCheck v-if="modelValue" weight="bold" />
    </span>
    <span v-if="label" class="base-checkbox__label">{{ label }}</span>
  </label>
</template>

<style scoped>
.base-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.base-checkbox--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.base-checkbox__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.base-checkbox__box {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 6px;
  border: 1px solid var(--surface-border);
  background: rgba(9, 15, 26, 0.72);
  color: var(--primary);
}

.base-checkbox__input:checked + .base-checkbox__box {
  border-color: rgba(122, 167, 255, 0.55);
  background: rgba(122, 167, 255, 0.16);
}

.base-checkbox__input:focus-visible + .base-checkbox__box {
  outline: 2px solid rgba(122, 167, 255, 0.55);
  outline-offset: 2px;
}

.base-checkbox__box svg {
  width: 13px;
  height: 13px;
}
</style>
