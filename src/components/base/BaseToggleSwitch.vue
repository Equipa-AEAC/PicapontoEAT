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
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: rgba(71, 85, 105, 0.4);
  border: 1px solid var(--surface-border);
  position: relative;
  transition: background-color 160ms ease;
}

.base-toggle--on .base-toggle__track {
  background: linear-gradient(180deg, var(--primary), var(--primary-strong));
  border-color: transparent;
}

.base-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #eef2ff;
  transition: transform 160ms ease;
}

.base-toggle--on .base-toggle__thumb {
  transform: translateX(18px);
}

.base-toggle__input:focus-visible ~ .base-toggle__track {
  outline: 2px solid rgba(122, 167, 255, 0.55);
  outline-offset: 2px;
}
</style>
