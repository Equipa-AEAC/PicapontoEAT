<script setup lang="ts">
import InputText from "primevue/inputtext";
import { PhMagnifyingGlass } from "@phosphor-icons/vue";

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
    <InputText
      :modelValue="modelValue"
      :placeholder="placeholder ?? 'Search'"
      class="base-search-bar__input"
      @update:modelValue="emit('update:modelValue', String($event ?? ''))"
    />
  </label>
</template>
