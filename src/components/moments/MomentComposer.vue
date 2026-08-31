<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { PhImage, PhUploadSimple, PhX } from "@phosphor-icons/vue";

import { BaseButton, BaseFormDialog, BaseSelect, BaseTextarea } from "../../shared/components/base";
import { ACCEPTED_IMAGE_TYPES, formatFileSize } from "../../services/uploads.service";
import { MAX_MOMENT_CAPTION_LENGTH, MOMENT_LIFETIME_HOURS } from "../../types/moments";
import type { MomentFormValues } from "../../types/moments";
import type { ProjectSummary } from "../../types/projects";

/**
 * Post a moment.
 *
 * The photo is downscaled and re-encoded the moment it is chosen, so the size shown
 * under the preview is the size that will actually be stored — the author sees the
 * real cost before committing, rather than being rejected after pressing Post.
 */
const props = defineProps<{
  visible: boolean;
  projects: ProjectSummary[];
  loading: boolean;
  remainingQuota: number;
  /** Set by the parent when preparing or publishing failed. */
  errorMessage: string | null;
  /** Downscales the chosen file; resolves to null when it could not be processed. */
  prepare: (file: File) => Promise<{ imageUrl: string; bytes: number } | null>;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  submit: [values: MomentFormValues];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const preview = ref<{ imageUrl: string; bytes: number } | null>(null);
const caption = ref("");
const projectId = ref<string | null>(null);
const processing = ref(false);
const localError = ref<string | null>(null);

const projectOptions = computed(() => [
  { label: "Not linked to a project", value: null },
  ...props.projects
    .filter((project) => project.status !== "archived")
    .map((project) => ({ label: project.name, value: project.id })),
]);

const remainingCharacters = computed(() => MAX_MOMENT_CAPTION_LENGTH - caption.value.length);

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      return;
    }

    preview.value = null;
    caption.value = "";
    projectId.value = null;
    localError.value = null;
  },
);

function pickFile() {
  localError.value = null;
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  // Reset immediately so choosing the same file again still fires a change event.
  input.value = "";

  if (!file) {
    return;
  }

  processing.value = true;
  localError.value = null;
  preview.value = await props.prepare(file);
  processing.value = false;
}

function submit() {
  if (!preview.value) {
    localError.value = "Choose a photo first.";
    return;
  }

  emit("submit", {
    imageUrl: preview.value.imageUrl,
    bytes: preview.value.bytes,
    caption: caption.value.trim(),
    projectId: projectId.value,
  });
}
</script>

<template>
  <BaseFormDialog
    :visible="visible"
    title="Post a moment"
    :subtitle="`Photos stay in the gallery for ${MOMENT_LIFETIME_HOURS} hours, then disappear on their own.`"
    confirm-label="Post"
    :loading="loading || processing"
    @update:visible="emit('update:visible', $event)"
    @cancel="emit('update:visible', false)"
    @confirm="submit"
  >
    <div class="composer">
      <p v-if="localError || errorMessage" class="form-error-banner">{{ localError ?? errorMessage }}</p>

      <input
        ref="fileInput"
        type="file"
        class="u-visually-hidden"
        :accept="ACCEPTED_IMAGE_TYPES.join(',')"
        @change="onFileChange"
      />

      <button v-if="!preview" type="button" class="composer__dropzone" :disabled="processing" @click="pickFile">
        <PhImage weight="regular" />
        <span class="composer__dropzone-label">{{ processing ? 'Processing photo…' : 'Choose a photo' }}</span>
        <span class="type-meta">PNG, JPG or WebP. It is resized before it is stored.</span>
      </button>

      <div v-else class="composer__preview">
        <img :src="preview.imageUrl" alt="Preview of the photo you are about to post" />
        <div class="composer__preview-bar">
          <span class="type-meta">Stored size {{ formatFileSize(preview.bytes) }}</span>
          <BaseButton severity="secondary" size="small" @click="preview = null">
            <PhX weight="bold" />
            Change
          </BaseButton>
        </div>
      </div>

      <label class="composer__field">
        <span class="type-label">Caption</span>
        <BaseTextarea
          v-model="caption"
          :rows="2"
          :maxlength="MAX_MOMENT_CAPTION_LENGTH"
          placeholder="Fixing the lab terminals before the open day."
        />
        <span class="type-meta">{{ remainingCharacters }} characters left</span>
      </label>

      <label class="composer__field">
        <span class="type-label">Project</span>
        <BaseSelect
          :model-value="projectId"
          :options="projectOptions"
          @update:model-value="projectId = $event as string | null"
        />
      </label>

      <p class="type-meta composer__quota">
        <PhUploadSimple weight="regular" />
        You can post {{ remainingQuota }} more {{ remainingQuota === 1 ? 'moment' : 'moments' }} today.
      </p>
    </div>
  </BaseFormDialog>
</template>

<style scoped>
.composer {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.composer__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-5);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-subtle);
  color: var(--foreground-secondary);
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.composer__dropzone:hover:not(:disabled) {
  border-color: var(--primary);
  background: var(--primary-subtle);
}

.composer__dropzone:disabled {
  cursor: progress;
}

.composer__dropzone svg {
  width: 26px;
  height: 26px;
  color: var(--foreground-muted);
}

.composer__dropzone-label {
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.composer__preview {
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.composer__preview img {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: cover;
}

.composer__preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-top: var(--border-width) solid var(--border);
  background: var(--surface-subtle);
}

.composer__field {
  display: grid;
  gap: var(--space-1);
}

.composer__quota {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.composer__quota svg {
  width: 14px;
  height: 14px;
}
</style>
