<script setup lang="ts">
import { computed, reactive, watch } from "vue";

import BaseFormDialog from "../base/BaseFormDialog.vue";
import BaseDatePicker from "../base/BaseDatePicker.vue";
import BaseSelect from "../base/BaseSelect.vue";
import BaseTextInput from "../base/BaseTextInput.vue";
import BaseTextarea from "../base/BaseTextarea.vue";
import type { CalendarEvent, CalendarEventFormValues } from "../../types/calendarEvents";
import { validateCalendarEvent } from "../../types/calendarEvents";
import { calendarCategoryOptions, calendarVisibilityHint, calendarVisibilityOptions } from "../../i18n/vocabulary";

/**
 * Create or edit one calendar event.
 *
 * Shared by both workspaces rather than duplicated: the fields are the same, and
 * the only thing that differs is which projects a caller offers. Validation runs
 * through the same pure function the service uses, so the dialog cannot accept
 * something the service will refuse.
 */
const props = withDefaults(
  defineProps<{
    visible: boolean;
    /** Null when creating. */
    event?: CalendarEvent | null;
    /** Pre-selected day when the dialog is opened from a calendar cell. */
    defaultDate?: string;
    /** Projects the author may address an event to. */
    projectOptions: Array<{ label: string; value: string }>;
    busy?: boolean;
    errorMessage?: string | null;
  }>(),
  {
    event: null,
    defaultDate: "",
    busy: false,
    errorMessage: null,
  },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  save: [values: CalendarEventFormValues];
  cancel: [];
}>();

function blank(): CalendarEventFormValues {
  return {
    title: "",
    description: "",
    date: props.defaultDate,
    startTime: "",
    endTime: "",
    category: "session",
    visibility: "personal",
    projectId: null,
  };
}

const form = reactive<CalendarEventFormValues>(blank());

watch(
  () => [props.visible, props.event?.id, props.defaultDate],
  () => {
    if (!props.visible) {
      return;
    }

    if (props.event) {
      form.title = props.event.title;
      form.description = props.event.description;
      form.date = props.event.date;
      form.startTime = props.event.startTime ?? "";
      form.endTime = props.event.endTime ?? "";
      form.category = props.event.category;
      form.visibility = props.event.visibility;
      form.projectId = props.event.projectId;
      return;
    }

    Object.assign(form, blank());
  },
  { immediate: true },
);

/**
 * Project visibility is only offered when the author is actually on a project.
 * A dropdown whose only choice is "no projects" is a dead end, so the option is
 * removed rather than shown and refused.
 */
const visibilityOptions = computed(() =>
  calendarVisibilityOptions().filter(
    (option) => option.value !== "project" || props.projectOptions.length > 0,
  ),
);

const visibilityHint = computed(() => calendarVisibilityHint(form.visibility));
const problem = computed(() => validateCalendarEvent(form));
</script>

<template>
  <BaseFormDialog
    :visible="visible"
    :title="event ? $t('components.calendarEvent.editTitle') : $t('components.calendarEvent.addTitle')"
    :subtitle="$t('components.calendarEvent.subtitle')"
    :confirm-label="
      event ? $t('common.actions.saveChanges') : $t('components.calendarEvent.add')
    "
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
        <span>{{ $t("components.calendarEvent.fieldTitle") }}</span>
        <BaseTextInput v-model="form.title" :placeholder="$t('components.calendarEvent.titlePlaceholder')" />
      </label>

      <label>
        <span>{{ $t("components.calendarEvent.fieldDate") }}</span>
        <BaseDatePicker v-model="form.date" />
      </label>

      <label>
        <span>Type</span>
        <BaseSelect v-model="form.category" :options="calendarCategoryOptions()" />
      </label>

      <label>
        <span>{{ $t("common.time.starts") }}</span>
        <input v-model="form.startTime" class="time-input" type="time" />
      </label>

      <label>
        <span>{{ $t("common.time.ends") }}</span>
        <input v-model="form.endTime" class="time-input" type="time" />
      </label>

      <label class="settings-grid__wide">
        <span>{{ $t("components.calendarEvent.fieldVisibility") }}</span>
        <BaseSelect v-model="form.visibility" :options="visibilityOptions" />
        <small class="student-form__hint">{{ visibilityHint }}</small>
      </label>

      <label v-if="form.visibility === 'project'" class="settings-grid__wide">
        <span>{{ $t("components.calendarEvent.fieldProject") }}</span>
        <BaseSelect
          :model-value="form.projectId ?? ''"
          :options="projectOptions"
          :placeholder="$t('components.calendarEvent.pickProject')"
          @update:model-value="form.projectId = ($event as string) || null"
        />
      </label>

      <label class="settings-grid__wide">
        <span>{{ $t("common.fields.notes") }}</span>
        <BaseTextarea v-model="form.description" rows="3" auto-resize :placeholder="$t('components.calendarEvent.descriptionPlaceholder')" />
      </label>
    </div>

    <p v-if="problem" class="type-meta">{{ problem }}</p>
  </BaseFormDialog>
</template>

<style scoped>
.time-input {
  width: 100%;
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-sm);
  padding: 9px 14px;
  background: var(--input);
  color: var(--foreground);
}

.time-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
</style>
