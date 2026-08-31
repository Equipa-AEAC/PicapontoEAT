<script setup lang="ts">
import { reactive, ref, watch } from "vue";

import { BaseFormDialog, BaseSelect, BaseTextInput, BaseTextarea, BaseDatePicker } from "../../shared/components/base";
import ParticipantPicker from "./ParticipantPicker.vue";
import type {
  ProjectFormValues,
  ProjectParticipant,
  ProjectPriority,
  ProjectStatus,
  ProjectSummary,
} from "../../types/projects";
import { PROJECT_PRIORITY_OPTIONS, PROJECT_STATUS_OPTIONS } from "../../types/projects";

/**
 * Create and edit dialog for a project.
 *
 * Archived is not offered as a status here — archiving is an action on the project
 * row with its own confirmation, not something to fall into from a dropdown.
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

const statusOptions = PROJECT_STATUS_OPTIONS.filter((option) => option.value !== "archived");

const form = reactive<ProjectFormValues>({
  name: "",
  description: "",
  status: "planned",
  priority: "normal",
  ownerId: null,
  startDate: null,
  deadline: null,
  memberIds: [],
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

  errors.name = undefined;
  errors.deadline = undefined;
  submitted.value = false;
}

watch(() => [props.visible, props.project], reset, { immediate: true });

function validate(): boolean {
  errors.name = form.name.trim().length === 0 ? "Give the project a name." : undefined;
  errors.deadline =
    form.startDate && form.deadline && form.deadline < form.startDate
      ? "The deadline cannot fall before the start date."
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
  });
}

/** The owner list mirrors the assignable roster, plus an explicit unassigned option. */
function ownerOptions() {
  return [
    { label: "Unassigned", value: null },
    ...props.participants.map((participant) => ({
      label: `${participant.name} · ${participant.role}`,
      value: participant.id,
    })),
  ];
}
</script>

<template>
  <BaseFormDialog
    :visible="visible"
    :title="project ? 'Edit project' : 'New project'"
    :subtitle="project ? project.name : 'Projects group the work the team is doing and the people doing it.'"
    :confirm-label="project ? 'Save changes' : 'Create project'"
    :loading="loading"
    @update:visible="emit('update:visible', $event)"
    @cancel="emit('update:visible', false)"
    @confirm="onConfirm"
  >
    <div class="student-form">
      <div class="student-form__grid">
        <div class="student-form__full-width">
          <span class="student-form__label">Name</span>
          <BaseTextInput v-model="form.name" placeholder="RFID attendance terminals" />
          <span v-if="submitted && errors.name" class="student-form__error">{{ errors.name }}</span>
        </div>

        <div class="student-form__full-width">
          <span class="student-form__label">Description</span>
          <BaseTextarea v-model="form.description" :rows="3" placeholder="What this project covers and what done looks like." />
        </div>

        <div>
          <span class="student-form__label">Status</span>
          <BaseSelect
            :model-value="form.status"
            :options="statusOptions"
            @update:model-value="form.status = $event as ProjectStatus"
          />
        </div>

        <div>
          <span class="student-form__label">Priority</span>
          <BaseSelect
            :model-value="form.priority"
            :options="PROJECT_PRIORITY_OPTIONS"
            @update:model-value="form.priority = $event as ProjectPriority"
          />
        </div>

        <div class="student-form__full-width">
          <span class="student-form__label">Responsible</span>
          <BaseSelect
            :model-value="form.ownerId"
            :options="ownerOptions()"
            @update:model-value="form.ownerId = $event as string | null"
          />
        </div>

        <div>
          <span class="student-form__label">Start date</span>
          <BaseDatePicker
            :model-value="form.startDate ?? ''"
            @update:model-value="form.startDate = $event || null"
          />
        </div>

        <div>
          <span class="student-form__label">Deadline</span>
          <BaseDatePicker
            :model-value="form.deadline ?? ''"
            @update:model-value="form.deadline = $event || null"
          />
          <span v-if="submitted && errors.deadline" class="student-form__error">{{ errors.deadline }}</span>
        </div>

        <div class="student-form__full-width">
          <ParticipantPicker v-model="form.memberIds" :participants="participants" label="People on this project" />
        </div>
      </div>
    </div>
  </BaseFormDialog>
</template>
