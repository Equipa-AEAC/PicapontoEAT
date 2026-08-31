<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import {
  BaseDatePicker,
  BaseFormDialog,
  BaseInputNumber,
  BaseSelect,
  BaseTextInput,
  BaseTextarea,
} from "../../shared/components/base";
import ParticipantPicker from "./ParticipantPicker.vue";
import type {
  ProjectParticipant,
  ProjectPriority,
  ProjectSummary,
  ProjectTaskSummary,
  TaskFormValues,
  TaskStatus,
} from "../../types/projects";
import { PROJECT_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "../../types/projects";

/**
 * Create and edit dialog for a task.
 *
 * When `lockedProjectId` is set the project field is fixed and hidden — inside a
 * project workspace the answer is never in question, and showing a select whose
 * only sensible value is already chosen is just another thing to read.
 */
const props = defineProps<{
  visible: boolean;
  task: ProjectTaskSummary | null;
  projects: ProjectSummary[];
  participants: ProjectParticipant[];
  loading: boolean;
  lockedProjectId?: string | null;
  /** Column the task was created from, so the board opens it in the right status. */
  defaultStatus?: TaskStatus;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  submit: [values: TaskFormValues];
}>();

const form = reactive<TaskFormValues>({
  projectId: "",
  title: "",
  description: "",
  status: "todo",
  priority: "normal",
  assigneeIds: [],
  dueDate: null,
  estimatedHours: null,
});

const errors = reactive<{ title?: string; projectId?: string }>({});
const submitted = ref(false);

/** Assignment is limited to the people actually on the project, when it has any. */
const assignableParticipants = computed(() => {
  const project = props.projects.find((item) => item.id === form.projectId);

  if (!project || project.memberIds.length === 0) {
    return props.participants;
  }

  return props.participants.filter(
    (participant) => project.memberIds.includes(participant.id) || participant.id === project.ownerId,
  );
});

const projectOptions = computed(() =>
  props.projects
    .filter((project) => project.status !== "archived")
    .map((project) => ({ label: project.name, value: project.id })),
);

function reset() {
  const task = props.task;

  form.projectId = task?.projectId ?? props.lockedProjectId ?? projectOptions.value[0]?.value ?? "";
  form.title = task?.title ?? "";
  form.description = task?.description ?? "";
  form.status = task?.status ?? props.defaultStatus ?? "todo";
  form.priority = task?.priority ?? "normal";
  form.assigneeIds = [...(task?.assigneeIds ?? [])];
  form.dueDate = task?.dueDate ?? null;
  form.estimatedHours = task?.estimatedHours ?? null;

  errors.title = undefined;
  errors.projectId = undefined;
  submitted.value = false;
}

watch(() => [props.visible, props.task, props.defaultStatus], reset, { immediate: true });

function validate(): boolean {
  errors.title = form.title.trim().length === 0 ? "Give the task a title." : undefined;
  errors.projectId = form.projectId.length === 0 ? "Choose the project this task belongs to." : undefined;

  return !errors.title && !errors.projectId;
}

function onConfirm() {
  submitted.value = true;

  if (!validate()) {
    return;
  }

  emit("submit", {
    ...form,
    title: form.title.trim(),
    description: form.description.trim(),
    dueDate: form.dueDate || null,
    // Zero hours is not an estimate, it is the absence of one.
    estimatedHours: form.estimatedHours && form.estimatedHours > 0 ? form.estimatedHours : null,
  });
}
</script>

<template>
  <BaseFormDialog
    :visible="visible"
    :title="task ? 'Edit task' : 'New task'"
    :subtitle="task ? task.projectName : undefined"
    :confirm-label="task ? 'Save changes' : 'Create task'"
    :loading="loading"
    @update:visible="emit('update:visible', $event)"
    @cancel="emit('update:visible', false)"
    @confirm="onConfirm"
  >
    <div class="student-form">
      <div class="student-form__grid">
        <div v-if="!lockedProjectId" class="student-form__full-width">
          <span class="student-form__label">Project</span>
          <BaseSelect
            :model-value="form.projectId"
            :options="projectOptions"
            placeholder="Choose a project"
            @update:model-value="form.projectId = $event as string"
          />
          <span v-if="submitted && errors.projectId" class="student-form__error">{{ errors.projectId }}</span>
        </div>

        <div class="student-form__full-width">
          <span class="student-form__label">Title</span>
          <BaseTextInput v-model="form.title" placeholder="Flash firmware onto the lab terminals" />
          <span v-if="submitted && errors.title" class="student-form__error">{{ errors.title }}</span>
        </div>

        <div class="student-form__full-width">
          <span class="student-form__label">Description</span>
          <BaseTextarea v-model="form.description" :rows="3" placeholder="What has to be done, and how you know it is finished." />
        </div>

        <div>
          <span class="student-form__label">Status</span>
          <BaseSelect
            :model-value="form.status"
            :options="TASK_STATUS_OPTIONS"
            @update:model-value="form.status = $event as TaskStatus"
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

        <div>
          <span class="student-form__label">Due date</span>
          <BaseDatePicker :model-value="form.dueDate ?? ''" @update:model-value="form.dueDate = $event || null" />
        </div>

        <div>
          <span class="student-form__label">Estimated hours</span>
          <BaseInputNumber
            :model-value="form.estimatedHours ?? 0"
            :min="0"
            :max="500"
            @update:model-value="form.estimatedHours = $event"
          />
        </div>

        <div class="student-form__full-width">
          <ParticipantPicker v-model="form.assigneeIds" :participants="assignableParticipants" label="Responsible for this task" />
          <span class="student-form__hint">Only people assigned to the project are listed.</span>
        </div>
      </div>
    </div>
  </BaseFormDialog>
</template>
