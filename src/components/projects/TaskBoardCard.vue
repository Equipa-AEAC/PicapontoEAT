<script setup lang="ts">
import { computed } from "vue";
import { PhCalendarBlank, PhWarningCircle } from "@phosphor-icons/vue";

import type { ProjectTaskSummary } from "../../types/projects";
import { PROJECT_PRIORITY_LABELS } from "../../types/projects";

/**
 * One task on the board. Draggable, and the whole card is a button so it is
 * reachable and openable from the keyboard as well as the mouse.
 */
const props = defineProps<{ task: ProjectTaskSummary }>();

const emit = defineEmits<{ open: [task: ProjectTaskSummary]; dragstart: [task: ProjectTaskSummary] }>();

const dueLabel = computed(() => props.task.dueLabel);

const assigneeLabel = computed(() =>
  props.task.assignees.length === 0
    ? "Nobody assigned"
    : props.task.assignees.map((assignee) => assignee.name).join(", "),
);
</script>

<template>
  <div
    class="task-card"
    :class="{
      'task-card--overdue': task.isOverdue,
      'task-card--critical': task.priority === 'critical',
      'task-card--high': task.priority === 'high',
    }"
    draggable="true"
    role="button"
    tabindex="0"
    :aria-label="`${task.title}. ${assigneeLabel}.`"
    @dragstart="emit('dragstart', task)"
    @click="emit('open', task)"
    @keydown.enter.prevent="emit('open', task)"
    @keydown.space.prevent="emit('open', task)"
  >
    <p class="task-card__title">{{ task.title }}</p>

    <div class="task-card__meta">
      <span
        class="task-card__assignee type-meta"
        :class="{ 'task-card__assignee--none': task.assignees.length === 0 }"
      >
        {{ assigneeLabel }}
      </span>

      <span v-if="task.priority === 'critical' || task.priority === 'high'" class="task-card__priority type-meta">
        {{ PROJECT_PRIORITY_LABELS[task.priority] }}
      </span>
    </div>

    <p v-if="dueLabel" class="task-card__due type-meta" :class="{ 'task-card__due--overdue': task.isOverdue }">
      <PhWarningCircle v-if="task.isOverdue" weight="fill" />
      <PhCalendarBlank v-else weight="regular" />
      {{ dueLabel }}
    </p>
  </div>
</template>

<style scoped>
.task-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: var(--border-width) solid var(--border);
  border-left-width: 2px;
  border-left-color: var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  cursor: grab;
  text-align: left;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.task-card:hover {
  border-color: var(--border-strong);
  background: var(--surface-subtle);
}

.task-card:active {
  cursor: grabbing;
}

/* Priority is a left rule, so a column of cards is scannable without reading tags. */
.task-card--high {
  border-left-color: var(--warning);
}

.task-card--critical {
  border-left-color: var(--danger);
}

.task-card--overdue {
  border-left-color: var(--danger);
}

.task-card__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  line-height: var(--leading-snug);
  color: var(--foreground);
}

.task-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.task-card__assignee {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/*
 * Muted italics read as "nothing here"; unowned work is the opposite — it is the
 * card most likely to slip. Same warning colour as the Team and Tasks views.
 */
.task-card__assignee--none {
  color: var(--warning-foreground);
  font-weight: var(--weight-medium);
}

.task-card__priority {
  flex: none;
  padding: 0 var(--space-1);
  border-radius: var(--radius-xs);
  background: var(--warning-subtle);
  color: var(--warning-foreground);
  font-weight: var(--weight-semibold);
}

.task-card--critical .task-card__priority {
  background: var(--danger-subtle);
  color: var(--danger-foreground);
}

.task-card__due {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.task-card__due svg {
  width: 13px;
  height: 13px;
}

.task-card__due--overdue {
  color: var(--danger);
  font-weight: var(--weight-medium);
}
</style>
