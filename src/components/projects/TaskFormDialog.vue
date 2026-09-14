<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import {
  BaseCheckbox,
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
import { t } from "../../i18n";
import { projectPriorityOptions, taskStatusOptions } from "../../i18n/vocabulary";

/**
 * Create and edit dialog for a task.
 *
 * When `lockedProjectId` is set the project field is fixed and hidden — inside a
 * project workspace the answer is never in question, and showing a select whose
 * only sensible value is already chosen is just another thing to read.
 *
 * ## Assignment adapts to what the viewer may actually do
 *
 * `canAssignOthers` is false for an ordinary project member, and when it is
 * false the people picker is **not rendered at all** — not rendered and
 * disabled, which would still advertise a capability and invite the question of
 * why it is greyed out. What replaces it is the only decision that member can
 * make: whether this task is on their own list.
 *
 * Anybody already on the task stays on it. The self-only control adds and
 * removes `selfId` and nothing else, so editing a shared task cannot quietly
 * take a colleague off work the editor could never have assigned them.
 */
const props = withDefaults(
  defineProps<{
    visible: boolean;
    task: ProjectTaskSummary | null;
    projects: ProjectSummary[];
    participants: ProjectParticipant[];
    loading: boolean;
    lockedProjectId?: string | null;
    /** Column the task was created from, so the board opens it in the right status. */
    defaultStatus?: TaskStatus;
    /** False for a member who may only put work on their own list. */
    canAssignOthers?: boolean;
    /** Who "me" is, when assignment is limited to self. */
    selfId?: string | null;
  }>(),
  { lockedProjectId: null, canAssignOthers: true, selfId: null },
);

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

/* ------------------------------------------------------------ Self-only */

const assignedToMe = computed({
  get: () => Boolean(props.selfId) && form.assigneeIds.includes(props.selfId as string),
  set: (next: boolean) => {
    const self = props.selfId;

    if (!self) {
      return;
    }

    form.assigneeIds = next
      ? [...form.assigneeIds.filter((id) => id !== self), self]
      : form.assigneeIds.filter((id) => id !== self);
  },
});

/**
 * Everybody on the task who is not the viewer.
 *
 * Shown as read-only text rather than hidden: a member editing a shared task
 * should know who else is on it, and should see that their edit is not going to
 * remove them.
 */
const otherAssigneeNames = computed(() => {
  const self = props.selfId;

  return form.assigneeIds
    .filter((id) => id !== self)
    .map((id) => props.participants.find((participant) => participant.id === id)?.name ?? id);
});

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
  errors.title = form.title.trim().length === 0 ? t("projects.form.errorTitle") : undefined;
  errors.projectId = form.projectId.length === 0 ? t("projects.form.errorProject") : undefined;

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
    :title="task ? $t('projects.form.editTitle') : $t('projects.form.newTitle')"
    :subtitle="task ? task.projectName : undefined"
    :confirm-label="task ? $t('common.actions.saveChanges') : $t('projects.form.create')"
    :cancel-label="$t('common.actions.cancel')"
    :loading="loading"
    @update:visible="emit('update:visible', $event)"
    @cancel="emit('update:visible', false)"
    @confirm="onConfirm"
  >
    <div class="student-form">
      <div class="student-form__grid">
        <div v-if="!lockedProjectId" class="student-form__full-width">
          <span class="student-form__label">{{ $t("projects.form.project") }}</span>
          <BaseSelect
            :model-value="form.projectId"
            :options="projectOptions"
            :placeholder="$t('projects.form.chooseProject')"
            @update:model-value="form.projectId = $event as string"
          />
          <span v-if="submitted && errors.projectId" class="student-form__error">{{ errors.projectId }}</span>
        </div>

        <div class="student-form__full-width">
          <span class="student-form__label">{{ $t("projects.form.title") }}</span>
          <BaseTextInput v-model="form.title" :placeholder="$t('projects.form.titlePlaceholder')" />
          <span v-if="submitted && errors.title" class="student-form__error">{{ errors.title }}</span>
        </div>

        <div class="student-form__full-width">
          <span class="student-form__label">{{ $t("projects.form.description") }}</span>
          <BaseTextarea
            v-model="form.description"
            :rows="3"
            :placeholder="$t('projects.form.descriptionPlaceholder')"
          />
        </div>

        <div>
          <span class="student-form__label">{{ $t("common.fields.status") }}</span>
          <BaseSelect
            :model-value="form.status"
            :options="taskStatusOptions()"
            @update:model-value="form.status = $event as TaskStatus"
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

        <div>
          <span class="student-form__label">{{ $t("projects.form.dueDate") }}</span>
          <BaseDatePicker :model-value="form.dueDate ?? ''" @update:model-value="form.dueDate = $event || null" />
        </div>

        <div>
          <span class="student-form__label">{{ $t("projects.form.estimatedHours") }}</span>
          <BaseInputNumber
            :model-value="form.estimatedHours ?? 0"
            :min="0"
            :max="500"
            @update:model-value="form.estimatedHours = $event"
          />
        </div>

        <!--
          Two different controls, never both, and never a disabled one. Somebody
          who cannot hand work to other people is not shown a list of people.
        -->
        <div v-if="canAssignOthers" class="student-form__full-width">
          <ParticipantPicker
            v-model="form.assigneeIds"
            :participants="assignableParticipants"
            :label="$t('projects.form.responsible')"
          />
          <span class="student-form__hint">{{ $t("projects.form.onlyProjectPeople") }}</span>
        </div>

        <div v-else-if="selfId" class="student-form__full-width">
          <span class="student-form__label">{{ $t("projects.assignment.selfOnlyLabel") }}</span>

          <label class="assign-self">
            <BaseCheckbox v-model="assignedToMe" />
            <span>{{ $t("projects.assignment.assignToMe") }}</span>
          </label>

          <p v-if="otherAssigneeNames.length > 0" class="assign-self__others type-meta">
            {{ $t("projects.assignment.othersKept", { names: otherAssigneeNames.join(", ") }) }}
            <br />
            {{ $t("projects.assignment.othersKeptHint") }}
          </p>

          <span class="student-form__hint">{{ $t("projects.assignment.selfOnlyHint") }}</span>
        </div>
      </div>
    </div>
  </BaseFormDialog>
</template>

<style scoped>
.assign-self {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  color: var(--foreground);
  cursor: pointer;
}

.assign-self__others {
  margin: var(--space-2) 0 0;
  line-height: var(--leading-snug);
}
</style>
