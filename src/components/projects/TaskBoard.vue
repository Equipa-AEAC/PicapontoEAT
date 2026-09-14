<script setup lang="ts">
import { ref } from "vue";
import { PhPlus } from "@phosphor-icons/vue";

import TaskBoardCard from "./TaskBoardCard.vue";
import { t } from "../../i18n";
import { taskStatusLabel } from "../../i18n/vocabulary";
import type { ProjectBoardColumn, ProjectTaskSummary, TaskStatus } from "../../types/projects";

/**
 * Kanban board for one project.
 *
 * Drag-and-drop uses the native HTML drag API rather than a library: the only thing
 * being moved is a task id between five columns, which does not justify a dependency.
 * Every column also has a keyboard-reachable "Add" button, and each card opens with
 * Enter, so the board is fully usable without a mouse.
 *
 * `canAdd` and `canMove` come from the viewer's rights on this project. A board
 * that may not be added to shows no add buttons, and one that may not be moved
 * is not draggable at all — a card that lifts and then refuses to land is worse
 * than a card that never lifted.
 */
withDefaults(defineProps<{ columns: ProjectBoardColumn[]; canAdd?: boolean; canMove?: boolean }>(), {
  canAdd: true,
  canMove: true,
});

const emit = defineEmits<{
  move: [taskId: string, status: TaskStatus];
  open: [task: ProjectTaskSummary];
  add: [status: TaskStatus];
}>();

const draggingTask = ref<ProjectTaskSummary | null>(null);
const dropTarget = ref<TaskStatus | null>(null);

function onDragStart(task: ProjectTaskSummary) {
  draggingTask.value = task;
}

function onDragOver(status: TaskStatus) {
  dropTarget.value = status;
}

function onDrop(status: TaskStatus) {
  const task = draggingTask.value;
  dropTarget.value = null;
  draggingTask.value = null;

  if (task && task.status !== status) {
    emit("move", task.id, status);
  }
}
</script>

<template>
  <div class="task-board">
    <section
      v-for="column in columns"
      :key="column.status"
      class="task-board__column"
      :class="{ 'task-board__column--drop': dropTarget === column.status }"
      @dragover.prevent="onDragOver(column.status)"
      @dragleave="dropTarget = null"
      @drop.prevent="onDrop(column.status)"
    >
      <header class="task-board__header">
        <h3 class="task-board__title type-label">
          {{ taskStatusLabel(column.status) }}
          <span class="task-board__count type-numeric">{{ column.tasks.length }}</span>
        </h3>
        <button
          v-if="canAdd"
          type="button"
          class="task-board__add"
          :aria-label="t('projects.board.addTo', { column: taskStatusLabel(column.status) })"
          @click="emit('add', column.status)"
        >
          <PhPlus weight="bold" />
        </button>
      </header>

      <div class="task-board__cards">
        <TaskBoardCard
          v-for="task in column.tasks"
          :key="task.id"
          :task="task"
          :draggable="canMove"
          @dragstart="onDragStart"
          @open="emit('open', $event)"
        />

        <p v-if="column.tasks.length === 0" class="task-board__empty type-meta">{{ $t("projects.board.empty") }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.task-board {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(220px, 1fr);
  gap: var(--space-3);
  overflow-x: auto;
  padding-bottom: var(--space-2);
}

.task-board__column {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-3);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--background-sunken);
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.task-board__column--drop {
  border-color: var(--primary);
  background: var(--primary-subtle);
}

.task-board__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.task-board__title {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--foreground-secondary);
}

.task-board__count {
  padding: 0 var(--space-1);
  border-radius: var(--radius-xs);
  background: var(--secondary-subtle);
  color: var(--foreground-muted);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-normal);
}

.task-board__add {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--foreground-muted);
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.task-board__add:hover {
  background: var(--hover);
  color: var(--foreground);
}

.task-board__add svg {
  width: 13px;
  height: 13px;
}

.task-board__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 40px;
}

.task-board__empty {
  padding: var(--space-3) 0;
  text-align: center;
  color: var(--foreground-subtle);
}
</style>
