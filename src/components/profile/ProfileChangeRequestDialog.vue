<script setup lang="ts">
import { computed, reactive, watch } from "vue";

import BaseFormDialog from "../base/BaseFormDialog.vue";
import BaseImageUpload from "../base/BaseImageUpload.vue";
import BaseSelect from "../base/BaseSelect.vue";
import BaseTextInput from "../base/BaseTextInput.vue";
import BaseTextarea from "../base/BaseTextarea.vue";
import type { ProfileChangeField, ProfileChangeFormValues } from "../../types/profileChangeRequests";
import { validateProfileChange } from "../../types/profileChangeRequests";
import { profileFieldHint, profileFieldLabel, profileFieldOptions } from "../../i18n/vocabulary";
import { t } from "../../i18n";

/**
 * Ask for one controlled field to be changed.
 *
 * The dialog shows what the record holds today next to what is being asked for,
 * because the member is not editing a value — they are proposing one, and the
 * reviewer will be looking at exactly this comparison. Presenting it as a plain
 * edit form would imply the change has already happened.
 */
const props = withDefaults(
  defineProps<{
    visible: boolean;
    /** The member's name, for the avatar fallback on the photo field. */
    memberName: string;
    /** Current record values, keyed by field. */
    currentValues: Record<ProfileChangeField, string>;
    /** Fields that already have a request waiting, so they cannot be asked twice. */
    fieldsWithOpenRequest: ProfileChangeField[];
    /** Which field the dialog opens on. */
    initialField?: ProfileChangeField;
    busy?: boolean;
    errorMessage?: string | null;
  }>(),
  {
    initialField: "email",
    busy: false,
    errorMessage: null,
  },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  save: [values: ProfileChangeFormValues];
  cancel: [];
}>();

const form = reactive<ProfileChangeFormValues>({
  field: props.initialField,
  requestedValue: "",
  reason: "",
});

watch(
  () => [props.visible, props.initialField],
  () => {
    if (!props.visible) {
      return;
    }

    form.field = props.initialField;
    form.requestedValue = "";
    form.reason = "";
  },
  { immediate: true },
);

/** Switching field clears the proposed value — an email is not a phone number. */
watch(
  () => form.field,
  () => {
    form.requestedValue = "";
  },
);

const fieldOptions = computed(() =>
  profileFieldOptions().map((option) => ({
    ...option,
    label: props.fieldsWithOpenRequest.includes(option.value)
      ? t("components.profileRequest.alreadyRequested", { field: option.label })
      : option.label,
  })),
);

const currentValue = computed(() => props.currentValues[form.field] ?? "");
const problem = computed(() => validateProfileChange(form, currentValue.value));
</script>

<template>
  <BaseFormDialog
    :visible="visible"
    :title="$t('components.profileRequest.title')"
    :subtitle="$t('components.profileRequest.subtitle')"
    :confirm-label="$t('components.profileRequest.confirm')"
    :cancel-label="$t('common.actions.cancel')"
    :loading="busy"
    :confirm-disabled="problem !== null"
    @update:visible="emit('update:visible', $event)"
    @confirm="emit('save', { ...form })"
    @cancel="emit('cancel')"
  >
    <p v-if="errorMessage" class="form-error-banner">{{ errorMessage }}</p>

    <div class="settings-grid">
      <label class="settings-grid__wide">
        <span>{{ $t("components.profileRequest.whatNeedsChanging") }}</span>
        <BaseSelect v-model="form.field" :options="fieldOptions" />
        <small class="student-form__hint">{{ profileFieldHint(form.field) }}</small>
      </label>

      <!-- Current and requested, side by side: this is what the reviewer compares. -->
      <div class="settings-grid__wide change-preview">
        <div class="change-preview__side">
          <p class="type-label">{{ $t("components.profileRequest.currentlyRecorded") }}</p>
          <img
            v-if="form.field === 'photo' && currentValue"
            :src="currentValue"
            :alt="$t('components.profileRequest.currentAlt')"
            class="change-preview__photo"
          />
          <p v-else class="change-preview__value">
            {{
              currentValue ||
              (form.field === 'photo'
                ? $t('components.profileRequest.noPictureOnFile')
                : $t('components.profileRequest.nothingRecorded'))
            }}
          </p>
        </div>

        <div class="change-preview__side">
          <p class="type-label">{{ $t("components.profileRequest.youAreAskingFor") }}</p>
          <p v-if="form.field !== 'photo'" class="change-preview__value change-preview__value--new">
            {{ form.requestedValue || '—' }}
          </p>
          <img
            v-else-if="form.requestedValue"
            :src="form.requestedValue"
            :alt="$t('components.profileRequest.proposedAlt')"
            class="change-preview__photo"
          />
          <p v-else class="change-preview__value">—</p>
        </div>
      </div>

      <label v-if="form.field !== 'photo'" class="settings-grid__wide">
        <span>
          {{ $t("components.profileRequest.newValueLabel", { field: profileFieldLabel(form.field).toLowerCase() }) }}
        </span>
        <BaseTextInput
          v-model="form.requestedValue"
          :type="form.field === 'email' ? 'email' : 'text'"
          :placeholder="
            form.field === 'email'
              ? $t('components.profileRequest.emailPlaceholder')
              : $t('components.profileRequest.phonePlaceholder')
          "
        />
      </label>

      <div v-else class="settings-grid__wide">
        <span class="type-label">{{ $t("components.profileRequest.newPicture") }}</span>
        <BaseImageUpload v-model="form.requestedValue" :label="memberName" />
        <small class="student-form__hint">
          {{ $t("components.profileRequest.photoHint") }}
        </small>
      </div>

      <label class="settings-grid__wide">
        <span>{{ $t("components.profileRequest.whyRequired") }}</span>
        <BaseTextarea
          v-model="form.reason"
          rows="3"
          auto-resize
          :placeholder="$t('components.profileRequest.reasonPlaceholder')"
        />
      </label>
    </div>

    <p v-if="problem" class="type-meta">{{ problem }}</p>
  </BaseFormDialog>
</template>

<style scoped>
.change-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.change-preview__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.change-preview__value {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.change-preview__value--new {
  font-weight: var(--weight-medium);
  color: var(--primary);
}

.change-preview__photo {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-md);
  object-fit: cover;
  border: var(--border-width) solid var(--border);
}
</style>
