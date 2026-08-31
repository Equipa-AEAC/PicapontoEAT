<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();
</script>

<template>
  <label class="base-toggle" :class="{ 'base-toggle--on': modelValue, 'base-toggle--disabled': disabled }">
    <input
      type="checkbox"
      class="base-toggle__input"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="base-toggle__track">
      <span class="base-toggle__thumb" />
    </span>
  </label>
</template>

<style scoped>
.base-toggle {
  display: inline-flex;
  cursor: pointer;
}

.base-toggle--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.base-toggle__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.base-toggle__track {
  width: 38px;
  height: 22px;
  border-radius: var(--radius-pill);
  background: var(--track);
  border: var(--border-width) solid var(--input-border);
  position: relative;
  transition: background-color var(--transition-base), border-color var(--transition-base);
}

.base-toggle--on .base-toggle__track {
  background: var(--primary);
  border-color: var(--primary);
}

.base-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-base);
}

.base-toggle--on .base-toggle__thumb {
  transform: translateX(16px);
}

.base-toggle__input:focus-visible ~ .base-toggle__track {
  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: 2px;
}
</style>
