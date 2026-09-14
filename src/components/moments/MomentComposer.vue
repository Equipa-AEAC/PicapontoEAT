<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { PhImage, PhUploadSimple, PhX } from "@phosphor-icons/vue";

import { BaseButton, BaseFormDialog, BaseSelect, BaseTextarea } from "../../shared/components/base";
import { ACCEPTED_IMAGE_TYPES, formatFileSize } from "../../services/uploads.service";
import { MAX_MOMENT_CAPTION_LENGTH, MOMENT_LIFETIME_HOURS } from "../../types/moments";
import type { MomentFormValues } from "../../types/moments";
import type { ProjectSummary } from "../../types/projects";
import { t } from "../../i18n";

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
  { label: t("components.moment.noProject"), value: null },
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
    localError.value = t("errors.photoFirst");
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
    :title="$t('components.moment.composeTitle')"
    :subtitle="$t('components.moment.lifetimeSubtitle', { hours: MOMENT_LIFETIME_HOURS })"
    :confirm-label="$t('components.moment.compose')"
    :cancel-label="$t('common.actions.cancel')"
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
        <span class="composer__dropzone-label">{{ processing ? $t('components.moment.processing') : $t('components.moment.choosePhoto') }}</span>
        <span class="type-meta">{{ $t("components.moment.dropzoneHint") }}</span>
      </button>

      <div v-else class="composer__preview">
        <img :src="preview.imageUrl" :alt="$t('components.moment.previewAlt')" />
        <div class="composer__preview-bar">
          <span class="type-meta">
            {{ $t("components.moment.storedSize", { size: formatFileSize(preview.bytes) }) }}
          </span>
          <BaseButton severity="secondary" size="small" @click="preview = null">
            <PhX weight="bold" />
            {{ $t("components.moment.change") }}
          </BaseButton>
        </div>
      </div>

      <label class="composer__field">
        <span class="type-label">{{ $t("components.moment.caption") }}</span>
        <BaseTextarea
          v-model="caption"
          :rows="2"
          :maxlength="MAX_MOMENT_CAPTION_LENGTH"
          :placeholder="$t('components.moment.captionPlaceholder')"
        />
        <span class="type-meta">{{ $t("common.units.charactersLeft", { count: remainingCharacters }) }}</span>
      </label>

      <label class="composer__field">
        <span class="type-label">{{ $t("components.moment.project") }}</span>
        <BaseSelect
          :model-value="projectId"
          :options="projectOptions"
          @update:model-value="projectId = $event as string | null"
        />
      </label>

      <p class="type-meta composer__quota">
        <PhUploadSimple weight="regular" />
        {{ $t("components.moment.quotaLeft", { count: remainingQuota }, remainingQuota) }}
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
