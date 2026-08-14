<script setup lang="ts">
import { PhMagnifyingGlass } from "@phosphor-icons/vue";
import BaseTextInput from "./BaseTextInput.vue";

defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <label class="base-search-bar">
    <PhMagnifyingGlass weight="bold" class="base-search-bar__icon" />
    <BaseTextInput
      :modelValue="modelValue"
      :placeholder="placeholder ?? 'Search'"
      class="base-search-bar__input"
      @update:modelValue="emit('update:modelValue', $event)"
    />
  </label>
</template>

<style scoped>
.base-search-bar {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 240px;
  flex: 1 1 240px;
}

.base-search-bar__icon {
  position: absolute;
  left: 14px;
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}

.base-search-bar__input {
  padding-left: 40px;
}
</style>
