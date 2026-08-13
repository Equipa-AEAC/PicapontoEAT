<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    rows?: number | string;
    autoResize?: boolean;
    placeholder?: string;
  }>(),
  {
    rows: 3,
    autoResize: false,
    placeholder: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

function resize() {
  if (!props.autoResize || !textareaRef.value) {
    return;
  }
  textareaRef.value.style.height = "auto";
  textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`;
}

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
  resize();
}

watch(() => props.modelValue, () => nextTick(resize));
onMounted(resize);
</script>

<template>
  <textarea
    ref="textareaRef"
    class="base-textarea"
    :class="{ 'base-textarea--auto': autoResize }"
    :rows="rows"
    :value="modelValue"
    :placeholder="placeholder"
    @input="onInput"
  />
</template>

<style scoped>
.base-textarea {
  width: 100%;
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  background: rgba(9, 15, 26, 0.72);
  color: var(--text-primary);
  resize: vertical;
  font-family: inherit;
}

.base-textarea--auto {
  resize: none;
  overflow: hidden;
}

.base-textarea::placeholder {
  color: var(--text-muted);
}

.base-textarea:focus {
  outline: none;
  border-color: rgba(122, 167, 255, 0.55);
}
</style>
