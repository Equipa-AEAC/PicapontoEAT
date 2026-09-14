<script setup lang="ts">
import { computed } from "vue";

import type { ProjectProgress } from "../../types/projects";

/**
 * Task completion for one project. The bar turns amber or red when work is blocked
 * or overdue, so a project that is "70% done" but stuck reads differently from one
 * that is simply 70% done.
 */
const props = withDefaults(
  defineProps<{
    progress: ProjectProgress;
    /** Hides the counts line, for dense table cells. */
    compact?: boolean;
  }>(),
  { compact: false },
);

const tone = computed(() => {
  if (props.progress.overdue > 0) return "danger";
  if (props.progress.blocked > 0) return "warning";
  if (props.progress.total > 0 && props.progress.done === props.progress.total) return "success";
  return "";
});
</script>

<template>
  <div class="project-progress">
    <div class="project-progress__head">
      <span class="project-progress__value type-numeric">{{ progress.percent }}%</span>
      <span v-if="!compact" class="project-progress__counts type-meta">
        {{ $t("projects.progress.barCounts", { done: progress.done, total: progress.total }) }}
      </span>
    </div>

    <div
      class="progress-bar"
      role="progressbar"
      :aria-valuenow="progress.percent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="progress-bar__fill"
        :class="tone ? `progress-bar__fill--${tone}` : ''"
        :style="{ width: `${progress.percent}%` }"
      />
    </div>

    <p v-if="!compact && (progress.overdue > 0 || progress.blocked > 0)" class="project-progress__flags type-meta">
      <span v-if="progress.overdue > 0" class="project-progress__flag project-progress__flag--danger">
        {{ $t("projects.progress.overdueCount", { count: progress.overdue }) }}
      </span>
      <span v-if="progress.blocked > 0" class="project-progress__flag project-progress__flag--warning">
        {{ $t("projects.progress.blockedCount", { count: progress.blocked }) }}
      </span>
    </p>
  </div>
</template>

<style scoped>
.project-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.project-progress__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.project-progress__value {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--foreground);
}

.project-progress__flags {
  display: flex;
  gap: var(--space-3);
}

.project-progress__flag--danger {
  color: var(--danger);
  font-weight: var(--weight-medium);
}

.project-progress__flag--warning {
  color: var(--warning);
  font-weight: var(--weight-medium);
}
</style>
