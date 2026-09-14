<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import { BaseFormDialog, BaseSelect, BaseTextInput, BaseTextarea, BaseDatePicker } from "../../shared/components/base";
import ParticipantPicker from "./ParticipantPicker.vue";
import type {
  ProjectFormValues,
  ProjectParticipant,
  ProjectPriority,
  ProjectStatus,
  ProjectSummary,
} from "../../types/projects";
import { t } from "../../i18n";
import {
  participantRoleLabel,
  projectPriorityOptions,
  projectStatusOptions,
} from "../../i18n/vocabulary";

/**
 * Create and edit dialog for a project.
 *
 * Archived is not offered as a status here — archiving is an action on the project
 * row with its own confirmation, not something to fall into from a dropdown.
 *
 * **Task coordinators are granted here**, and only here. Being on a project lets
 * somebody do the work; handing work to *other people* is a separate capability,
 * and this is the surface that grants it. It is deliberately part of setting the
 * project up rather than a per-person global flag: a member can reasonably lead
 * one project and simply take part in another, and only the person defining the
 * project knows which.
 */
const props = defineProps<{
  visible: boolean;
  project: ProjectSummary | null;
  participants: ProjectParticipant[];
  loading: boolean;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  submit: [values: ProjectFormValues];
}>();

const statusOptions = computed(() => projectStatusOptions().filter((option) => option.value !== "archived"));

const form = reactive<ProjectFormValues>({
  name: "",
  description: "",
  status: "planned",
  priority: "normal",
  ownerId: null,
  startDate: null,
  deadline: null,
  memberIds: [],
  coordinatorIds: [],
});

const errors = reactive<{ name?: string; deadline?: string }>({});
const submitted = ref(false);

function reset() {
  const project = props.project;

  form.name = project?.name ?? "";
  form.description = project?.description ?? "";
  form.status = (project?.status === "archived" ? "active" : project?.status) ?? "planned";
  form.priority = project?.priority ?? "normal";
  form.ownerId = project?.ownerId ?? null;
  form.startDate = project?.startDate ?? null;
  form.deadline = project?.deadline ?? null;
  form.memberIds = [...(project?.memberIds ?? [])];
  form.coordinatorIds = [...(project?.coordinatorIds ?? [])];

  errors.name = undefined;
  errors.deadline = undefined;
  submitted.value = false;
}

watch(() => [props.visible, props.project], reset, { immediate: true });

function validate(): boolean {
  errors.name = form.name.trim().length === 0 ? t("projects.projectForm.errorName") : undefined;
  errors.deadline =
    form.startDate && form.deadline && form.deadline < form.startDate
      ? t("projects.projectForm.errorDeadline")
      : undefined;

  return !errors.name && !errors.deadline;
}

function onConfirm() {
  submitted.value = true;

  if (!validate()) {
    return;
  }

  emit("submit", {
    ...form,
    name: form.name.trim(),
    description: form.description.trim(),
    // An empty date input reports "", which is not a missing date to the model.
    startDate: form.startDate || null,
    deadline: form.deadline || null,
    /*
     * A coordinator who is no longer on the project is not a coordinator.
     * Without this, removing somebody from the team would leave them holding
     * the right to assign work on it — invisible in the interface, and live in
     * the permission check.
     */
    coordinatorIds: form.coordinatorIds.filter((id) => form.memberIds.includes(id) || id === form.ownerId),
  });
}

/** The owner list mirrors the assignable roster, plus an explicit unassigned option. */
function ownerOptions() {
  return [
    { label: t("common.state.notAssigned"), value: null },
    ...props.participants.map((participant) => ({
      label: `${participant.name} · ${participantRoleLabel(participant.role)}`,
      value: participant.id,
    })),
  ];
}

/** Only people already on the project can be trusted to hand out its work. */
const coordinatorCandidates = computed(() =>
  props.participants.filter(
    (participant) => form.memberIds.includes(participant.id) || participant.id === form.ownerId,
  ),
);
</script>

<template>
  <BaseFormDialog
    :visible="visible"
    :title="project ? $t('projects.projectForm.editTitle') : $t('projects.projectForm.newTitle')"
    :subtitle="project ? project.name : $t('projects.projectForm.subtitle')"
    :confirm-label="project ? $t('common.actions.saveChanges') : $t('projects.projectForm.create')"
    :cancel-label="$t('common.actions.cancel')"
    :loading="loading"
    @update:visible="emit('update:visible', $event)"
    @cancel="emit('update:visible', false)"
    @confirm="onConfirm"
  >
    <div class="student-form">
      <div class="student-form__grid">
        <div class="student-form__full-width">
          <span class="student-form__label">{{ $t("common.fields.name") }}</span>
          <BaseTextInput v-model="form.name" :placeholder="$t('projects.projectForm.namePlaceholder')" />
          <span v-if="submitted && errors.name" class="student-form__error">{{ errors.name }}</span>
        </div>

        <div class="student-form__full-width">
          <span class="student-form__label">{{ $t("common.fields.description") }}</span>
          <BaseTextarea
            v-model="form.description"
            :rows="3"
            :placeholder="$t('projects.projectForm.descriptionPlaceholder')"
          />
        </div>

        <div>
          <span class="student-form__label">{{ $t("common.fields.status") }}</span>
          <BaseSelect
            :model-value="form.status"
            :options="statusOptions"
            @update:model-value="form.status = $event as ProjectStatus"
          />
        </div>

        <div>
          <span class="student-form__label">{{ $t("common.fields.priority") }}</span>
          <BaseSelect
            :model-value="form.priority"
            :options="projectPriorityOptions()"
            @update:model-value="form.priority = $event as ProjectPriority"
          />
        </div>

        <div class="student-form__full-width">
          <span class="student-form__label">{{ $t("projects.projectForm.owner") }}</span>
          <BaseSelect
            :model-value="form.ownerId"
            :options="ownerOptions()"
            @update:model-value="form.ownerId = $event as string | null"
          />
        </div>

        <div>
          <span class="student-form__label">{{ $t("common.time.startDate") }}</span>
          <BaseDatePicker
            :model-value="form.startDate ?? ''"
            @update:model-value="form.startDate = $event || null"
          />
        </div>

        <div>
          <span class="student-form__label">{{ $t("common.time.deadline") }}</span>
          <BaseDatePicker
            :model-value="form.deadline ?? ''"
            @update:model-value="form.deadline = $event || null"
          />
          <span v-if="submitted && errors.deadline" class="student-form__error">{{ errors.deadline }}</span>
        </div>

        <div class="student-form__full-width">
          <ParticipantPicker
            v-model="form.memberIds"
            :participants="participants"
            :label="$t('projects.projectForm.people')"
          />
        </div>

        <!--
          The one place the "may assign work to others" right is handed out.
          Listed after the team, because it is a choice among the people just
          chosen, and empty by default — the owner alone until somebody decides
          otherwise.
        -->
        <div v-if="coordinatorCandidates.length > 0" class="student-form__full-width">
          <ParticipantPicker
            v-model="form.coordinatorIds"
            :participants="coordinatorCandidates"
            :label="$t('projects.projectForm.coordinators')"
          />
          <span class="student-form__hint">{{ $t("projects.projectForm.coordinatorsHint") }}</span>
        </div>
      </div>
    </div>
  </BaseFormDialog>
</template>
