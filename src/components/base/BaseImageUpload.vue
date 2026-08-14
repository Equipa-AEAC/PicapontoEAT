<script setup lang="ts">
import { ref } from "vue";
import { PhUploadSimple } from "@phosphor-icons/vue";

import BaseAvatar from "./BaseAvatar.vue";
import BaseButton from "./BaseButton.vue";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "../../services/uploads.service";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    /** Fallback initials shown while there is no image. */
    label?: string;
  }>(),
  {
    label: "",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const errorMessage = ref<string | null>(null);

function pickFile() {
  errorMessage.value = null;
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  uploading.value = true;
  errorMessage.value = null;

  try {
    const uploaded = await uploadImage(file);
    emit("update:modelValue", uploaded.url);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to upload the image.";
  } finally {
    uploading.value = false;
    // Allow re-selecting the same file after a failed attempt.
    input.value = "";
  }
}

function clearImage() {
  errorMessage.value = null;
  emit("update:modelValue", "");
}
</script>

<template>
  <div class="base-image-upload">
    <BaseAvatar :image="props.modelValue || null" :label="props.label || 'ME'" size="xlarge" />

    <div class="base-image-upload__controls">
      <input
        ref="fileInput"
        class="base-image-upload__input"
        type="file"
        :accept="ACCEPTED_IMAGE_TYPES.join(',')"
        @change="onFileChange"
      />

      <div class="inline-actions">
        <BaseButton severity="secondary" outlined size="small" :loading="uploading" @click="pickFile">
          <PhUploadSimple weight="bold" />
          <span>{{ props.modelValue ? "Replace photo" : "Upload photo" }}</span>
        </BaseButton>
        <BaseButton v-if="props.modelValue" label="Remove" text size="small" severity="danger" @click="clearImage" />
      </div>

      <small v-if="errorMessage" class="base-image-upload__error">{{ errorMessage }}</small>
      <small v-else class="base-image-upload__hint">PNG, JPG or WebP · max 2 MB</small>
    </div>
  </div>
</template>

<style scoped>
.base-image-upload {
  display: flex;
  align-items: center;
  gap: 16px;
}

.base-image-upload__controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.base-image-upload__input {
  display: none;
}

.base-image-upload__hint {
  color: var(--text-muted);
  font-size: 0.78rem;
}

.base-image-upload__error {
  color: var(--danger);
  font-size: 0.78rem;
}

.base-image-upload svg {
  width: 15px;
  height: 15px;
}
</style>
