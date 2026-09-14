<script setup lang="ts">
import { computed } from "vue";
import { PhPencilSimple, PhTrash, PhWarningCircle } from "@phosphor-icons/vue";

import BaseBadge from "../base/BaseBadge.vue";
import BaseButton from "../base/BaseButton.vue";
import BaseDialog from "../base/BaseDialog.vue";
import BaseSelect from "../base/BaseSelect.vue";
import type { ProjectTaskSummary, TaskStatus } from "../../types/projects";
import { PROJECT_PRIORITY_TONES } from "../../types/projects";
import { t } from "../../i18n";
import { projectPriorityLabel, taskStatusLabel, taskStatusOptions } from "../../i18n/vocabulary";
import { formatIsoDate } from "../../utils/date";

/**
 * One task, read before it is changed.
 *
 * The board used to open the edit form on click, which put a card's description
 * behind a textarea and made "what is this task" and "change this task" the same
 * gesture. Most clicks on a card are the first question, so this answers it —
 * and keeps the answer in a dialog rather than a panel, so the board it belongs
 * to stays where it was.
 *
 * ## Three separate permissions, three separate controls
 *
 * `canMove`, `canEdit` and `canRemove` are asked for individually rather than
 * derived from one another, because on a shared board they genuinely differ: a
 * project member may drag anybody's card, but may only rewrite or withdraw work
 * that is theirs. Each control is **absent** when it is not allowed rather than
 * present and disabled — a disabled Remove button still says "this is normally
 * yours to do", which is not the message.
 */
const props = withDefaults(
  defineProps<{
    visible: boolean;
    task: ProjectTaskSummary | null;
    /** Change the status from here. Open to everybody on the project. */
    canMove?: boolean;
    /** Open the edit form. Own tasks, or the whole board for a lead. */
    canEdit?: boolean;
    /** Take the task off the board. Same rule as editing. */
    canRemove?: boolean;
    busy?: boolean;
  }>(),
  { canMove: true, canEdit: true, canRemove: true, busy: false },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  edit: [task: ProjectTaskSummary];
  remove: [task: ProjectTaskSummary];
  "change-status": [taskId: string, status: TaskStatus];
}>();

const assignees = computed(() =>
  props.task && props.task.assignees.length > 0
    ? props.task.assignees.map((assignee) => assignee.name).join(", ")
    : t("projects.task.nobodyAssigned"),
);
</script>

<template>
  <BaseDialog
    :visible="visible"
    :header="task?.title ?? $t('projects.task.fallbackTitle')"
    class="task-detail-dialog"
    @update:visible="emit('update:visible', $event)"
  >
    <template v-if="task">
      <div class="task-detail__head">
        <BaseBadge :label="projectPriorityLabel(task.priority)" :tone="PROJECT_PRIORITY_TONES[task.priority]" />
        <span class="type-meta">{{ task.projectName }}</span>
        <span v-if="task.isOverdue" class="task-detail__late type-meta">
          <PhWarningCircle weight="fill" />
          {{ task.dueLabel }}
        </span>
      </div>

      <p class="task-detail__description">
        {{ task.description || $t("projects.task.noDescription") }}
      </p>

      <dl class="task-detail__facts">
        <div class="task-detail__row">
          <dt class="type-label">{{ $t("projects.task.assignedTo") }}</dt>
          <dd>{{ assignees }}</dd>
        </div>
        <div class="task-detail__row">
          <dt class="type-label">{{ $t("common.time.deadline") }}</dt>
          <dd>
            {{ task.dueDate ? formatIsoDate(task.dueDate) : $t("common.time.noDeadline") }}
            <span v-if="task.dueLabel" class="type-meta"> · {{ task.dueLabel }}</span>
          </dd>
        </div>
        <div v-if="task.estimatedHours !== null" class="task-detail__row">
          <dt class="type-label">{{ $t("projects.task.estimated") }}</dt>
          <dd>{{ $t("common.time.hoursShort", { count: task.estimatedHours }) }}</dd>
        </div>
        <div class="task-detail__row">
          <dt class="type-label">{{ $t("common.fields.status") }}</dt>
          <dd>
            <!--
              The one change worth making without leaving the reading view, and
              the one every project member may make. Everything else is behind
              Edit, so a glance cannot become an accidental rewrite.
            -->
            <BaseSelect
              v-if="canMove"
              :model-value="task.status"
              :options="taskStatusOptions()"
              :disabled="busy"
              @update:model-value="emit('change-status', task!.id, $event as TaskStatus)"
            />
            <span v-else>{{ taskStatusLabel(task.status) }}</span>
          </dd>
        </div>
      </dl>
    </template>

    <template #footer>
      <div class="task-detail__footer">
        <BaseButton :label="$t('common.actions.close')" severity="secondary" text @click="emit('update:visible', false)" />

        <BaseButton v-if="canRemove && task" severity="danger" outlined :disabled="busy" @click="emit('remove', task)">
          <PhTrash weight="bold" />
          {{ $t("common.actions.remove") }}
        </BaseButton>

        <BaseButton v-if="canEdit && task" :disabled="busy" @click="emit('edit', task)">
          <PhPencilSimple weight="bold" />
          {{ $t("common.actions.edit") }}
        </BaseButton>
      </div>
    </template>
  </BaseDialog>
</template>

<style scoped>
.task-detail__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.task-detail__late {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--danger);
  font-weight: var(--weight-medium);
}

.task-detail__late svg {
  width: 13px;
  height: 13px;
}

.task-detail__description {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--foreground-secondary);
  white-space: pre-wrap;
}

.task-detail__facts {
  margin: 0;
  display: flex;
  flex-direction: column;
}

.task-detail__row {
  display: grid;
  grid-template-columns: minmax(90px, 130px) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.task-detail__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.task-detail__row dd {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--foreground);
}

.task-detail__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
