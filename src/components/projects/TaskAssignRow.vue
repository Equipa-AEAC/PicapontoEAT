<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { PhArrowRight, PhWarningCircle } from "@phosphor-icons/vue";

import { BaseBadge, BaseButton } from "../../shared/components/base";
import ParticipantPicker from "./ParticipantPicker.vue";
import type { ProjectParticipant, ProjectTaskSummary } from "../../shared/types";
import { PROJECT_PRIORITY_TONES, TASK_STATUS_TONES } from "../../shared/types";
import { projectPriorityLabel, taskStatusLabel } from "../../i18n/vocabulary";

/**
 * One task, with reassignment inline.
 *
 * Reassigning is the whole reason an administrator opens the team page, so it
 * happens in the row rather than behind a dialog on another screen. The picker
 * only unfolds when asked for — the row stays readable when you are scanning.
 */
const props = defineProps<{
  task: ProjectTaskSummary;
  participants: ProjectParticipant[];
  saving?: boolean;
  /** Show which project the task belongs to. Off inside a single project. */
  showProject?: boolean;
}>();

const emit = defineEmits<{
  assign: [taskId: string, assigneeIds: string[]];
  open: [projectId: string];
}>();

const editing = ref(false);
const draft = ref<string[]>([]);

const assigneeNames = computed(() => props.task.assignees.map((person) => person.name).join(", "));

const changed = computed(() => {
  const current = [...props.task.assignees.map((person) => person.id)].sort().join("|");

  return [...draft.value].sort().join("|") !== current;
});

function startEditing() {
  draft.value = props.task.assignees.map((person) => person.id);
  editing.value = true;
}

function apply() {
  emit("assign", props.task.id, draft.value);
}

/** Close as soon as the saved task comes back with the new people on it. */
watch(
  () => props.task.assignees.map((person) => person.id).join("|"),
  () => {
    editing.value = false;
  },
);
</script>

<template>
  <li class="assign-row" :class="{ 'assign-row--unowned': task.assignees.length === 0 }">
    <div class="assign-row__main">
      <span class="assign-row__title">{{ task.title }}</span>

      <span class="assign-row__meta type-meta">
        <button v-if="showProject" type="button" class="assign-row__project" @click="emit('open', task.projectId)">
          {{ task.projectName }}
        </button>
        <template v-if="showProject"> · </template>
        <span v-if="task.assignees.length">{{ assigneeNames }}</span>
        <span v-else class="assign-row__unowned-tag">{{ $t("components.taskAssign.nobodyAssigned") }}</span>
      </span>
    </div>

    <div class="assign-row__state">
      <BaseBadge :label="taskStatusLabel(task.status)" :tone="TASK_STATUS_TONES[task.status]" />
      <BaseBadge :label="projectPriorityLabel(task.priority)" :tone="PROJECT_PRIORITY_TONES[task.priority]" />
    </div>

    <span class="assign-row__due type-meta" :class="{ 'assign-row__due--overdue': task.isOverdue }">
      <PhWarningCircle v-if="task.isOverdue" weight="fill" />
      {{ task.dueLabel ?? '—' }}
    </span>

    <div class="assign-row__action">
      <BaseButton
        v-if="!editing"
        :label="task.assignees.length ? $t('components.taskAssign.reassign') : $t('components.taskAssign.assign')"
        severity="secondary"
        size="small"
        :outlined="task.assignees.length === 0"
        :text="task.assignees.length > 0"
        @click="startEditing"
      />
    </div>

    <div v-if="editing" class="assign-row__editor">
      <ParticipantPicker v-model="draft" :participants="participants" :label="$t('components.taskAssign.responsible')" />
      <div class="assign-row__editor-actions">
        <BaseButton :label="$t('common.actions.cancel')" severity="secondary" text size="small" @click="editing = false" />
        <BaseButton
          :label="$t('common.actions.save')"
          size="small"
          :loading="saving"
          :disabled="!changed"
          @click="apply"
        >
          {{ $t("common.actions.save") }}
          <PhArrowRight weight="bold" />
        </BaseButton>
      </div>
    </div>
  </li>
</template>

<style scoped>
.assign-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(90px, auto) minmax(90px, auto);
  align-items: center;
  gap: var(--space-3) var(--space-4);
  padding: var(--space-3) 0;
}

.assign-row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

/* Unowned work reads as a state, not as absent text. */
.assign-row--unowned {
  padding-left: var(--space-3);
  border-left: 2px solid var(--warning);
}

.assign-row__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.assign-row__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.assign-row__project {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.assign-row__project:hover {
  color: var(--primary);
}

.assign-row__unowned-tag {
  color: var(--warning-foreground);
  font-weight: var(--weight-medium);
}

.assign-row__state {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.assign-row__due {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  white-space: nowrap;
}

.assign-row__due svg {
  width: 13px;
  height: 13px;
}

.assign-row__due--overdue {
  color: var(--danger);
  font-weight: var(--weight-medium);
}

.assign-row__action {
  justify-self: end;
}

.assign-row__editor {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-elevated);
}

.assign-row__editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

@media (max-width: 900px) {
  .assign-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .assign-row__due {
    grid-column: 1;
  }

  .assign-row__action {
    justify-self: start;
  }
}
</style>
