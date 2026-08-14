<script setup lang="ts">
import { ref } from "vue";
import { PhFilePdf, PhUploadSimple } from "@phosphor-icons/vue";

import BaseButton from "./BaseButton.vue";
import { ACCEPTED_DOCUMENT_TYPES, formatFileSize, uploadDocument, type UploadedFile } from "../../services/uploads.service";

const props = withDefaults(
  defineProps<{
    /** The file already stored for this slot, or null while empty. */
    modelValue: UploadedFile | null;
    label?: string;
    /** Shown under the control while no file is stored. */
    hint?: string;
    uploadLabel?: string;
    disabled?: boolean;
    /** Extra line rendered next to the file name, e.g. an upload date. */
    meta?: string;
  }>(),
  {
    label: "",
    hint: "PDF · max 5 MB",
    uploadLabel: "Upload PDF",
    disabled: false,
    meta: "",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: UploadedFile | null];
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
    emit("update:modelValue", await uploadDocument(file));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to upload the document.";
  } finally {
    uploading.value = false;
    // Allow re-selecting the same file after a failed attempt.
    input.value = "";
  }
}

function openFile() {
  if (props.modelValue) {
    window.open(props.modelValue.url, "_blank", "noopener");
  }
}

function clearFile() {
  errorMessage.value = null;
  emit("update:modelValue", null);
}
</script>

<template>
  <div class="base-file-upload">
    <p v-if="label" class="base-file-upload__label">{{ label }}</p>

    <input
      ref="fileInput"
      class="base-file-upload__input"
      type="file"
      :accept="ACCEPTED_DOCUMENT_TYPES.join(',')"
      @change="onFileChange"
    />

    <div v-if="modelValue" class="base-file-upload__file">
      <PhFilePdf weight="bold" class="base-file-upload__file-icon" />
      <div class="base-file-upload__file-copy">
        <strong>{{ modelValue.fileName }}</strong>
        <small>{{ formatFileSize(modelValue.size) }}<template v-if="meta"> · {{ meta }}</template></small>
      </div>
      <div class="inline-actions">
        <BaseButton label="Open" text size="small" @click="openFile" />
        <BaseButton label="Replace" text size="small" :disabled="disabled" :loading="uploading" @click="pickFile" />
        <BaseButton label="Remove" text size="small" severity="danger" :disabled="disabled" @click="clearFile" />
      </div>
    </div>

    <div v-else class="base-file-upload__empty">
      <BaseButton severity="secondary" outlined size="small" :disabled="disabled" :loading="uploading" @click="pickFile">
        <PhUploadSimple weight="bold" />
        <span>{{ uploadLabel }}</span>
      </BaseButton>
      <small v-if="errorMessage" class="base-file-upload__error">{{ errorMessage }}</small>
      <small v-else class="base-file-upload__hint">{{ hint }}</small>
    </div>

    <small v-if="modelValue && errorMessage" class="base-file-upload__error">{{ errorMessage }}</small>
  </div>
</template>

<style scoped>
.base-file-upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.base-file-upload__label {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.base-file-upload__input {
  display: none;
}

.base-file-upload__file {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
  background: var(--surface-soft);
}

.base-file-upload__file-icon {
  width: 22px;
  height: 22px;
  flex: none;
  color: var(--danger);
}

.base-file-upload__file-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1 1 160px;
}

.base-file-upload__file-copy strong {
  color: var(--text-primary);
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.base-file-upload__file-copy small {
  color: var(--text-muted);
  font-size: 0.78rem;
}

.base-file-upload__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.base-file-upload__hint {
  color: var(--text-muted);
  font-size: 0.78rem;
}

.base-file-upload__error {
  color: var(--danger);
  font-size: 0.78rem;
}

.base-file-upload svg {
  width: 15px;
  height: 15px;
}

.base-file-upload__file-icon {
  width: 22px;
  height: 22px;
}
</style>
