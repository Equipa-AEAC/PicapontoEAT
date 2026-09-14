<script setup lang="ts">
import { computed } from "vue";
import {
  PhArchive,
  PhArrowCounterClockwise,
  PhCheckCircle,
  PhFolders,
  PhListChecks,
  PhPencilSimple,
  PhPlus,
  PhUserCircle,
  PhUsersFour,
} from "@phosphor-icons/vue";

import { BaseEmptyState } from "../../shared/components/base";
import type { ProjectActivityEvent, ProjectActivityKind } from "../../types/projects";
import { formatActivity } from "../../i18n/vocabulary";
import { formatRelativeTime } from "../../utils/date";

/**
 * The append-only project timeline.
 *
 * Rendered as a plain rule-separated list rather than a decorated timeline: at a
 * dozen entries a connector line and dots are noise, and what matters is who did
 * what and when — three columns of text.
 */
const props = withDefaults(
  defineProps<{
    events: ProjectActivityEvent[];
    /** Shows which project each event belongs to. Off inside a single project. */
    showProject?: boolean;
    projectNames?: Record<string, string>;
    emptyTitle?: string;
    emptyDescription?: string;
  }>(),
  {
    showProject: false,
    projectNames: () => ({}),
    emptyTitle: undefined,
    emptyDescription: undefined,
  },
);

const ICONS: Record<ProjectActivityKind, unknown> = {
  "project-created": PhPlus,
  "project-updated": PhPencilSimple,
  "project-archived": PhArchive,
  "project-restored": PhArrowCounterClockwise,
  "task-created": PhPlus,
  "task-updated": PhPencilSimple,
  "task-status-changed": PhCheckCircle,
  "task-assigned": PhUsersFour,
  "task-archived": PhArchive,
  "member-assigned": PhUsersFour,
  "member-removed": PhUsersFour,
};

function iconFor(kind: ProjectActivityKind) {
  return ICONS[kind] ?? PhListChecks;
}

const rows = computed(() =>
  props.events.map((event) => ({
    ...event,
    projectName: props.projectNames[event.projectId] ?? event.projectId,
    /*
     * Rendered from the recorded event, not from the sentence stored with it,
     * so a timeline written in one language reads correctly in the other.
     */
    text: formatActivity(event),
    relative: formatRelativeTime(event.createdAt),
  })),
);
</script>

<template>
  <div class="activity-feed">
    <BaseEmptyState
      v-if="rows.length === 0"
      :title="emptyTitle ?? $t('projects.studentDetail.activityTitle')"
      :description="emptyDescription ?? $t('projects.activity.empty')"
    />

    <ol v-else class="activity-feed__list">
      <li v-for="event in rows" :key="event.id" class="activity-feed__row">
        <span class="activity-feed__icon" aria-hidden="true">
          <component :is="iconFor(event.kind)" weight="regular" />
        </span>

        <div class="activity-feed__body">
          <p class="activity-feed__summary">{{ event.text }}</p>
          <p class="activity-feed__meta type-meta">
            <PhFolders v-if="showProject" weight="regular" class="activity-feed__meta-icon" />
            <span v-if="showProject">{{ event.projectName }}</span>
            <span v-if="showProject" aria-hidden="true">·</span>
            <PhUserCircle weight="regular" class="activity-feed__meta-icon" />
            <span>{{ event.actorName }}</span>
          </p>
        </div>

        <time class="activity-feed__time type-meta" :datetime="event.createdAt">{{ event.relative }}</time>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.activity-feed__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity-feed__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.activity-feed__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.activity-feed__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--secondary-subtle);
  color: var(--foreground-muted);
}

.activity-feed__icon svg {
  width: 13px;
  height: 13px;
}

.activity-feed__body {
  min-width: 0;
}

.activity-feed__summary {
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
  color: var(--foreground);
}

.activity-feed__meta {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: 2px;
}

.activity-feed__meta-icon {
  width: 12px;
  height: 12px;
}

.activity-feed__time {
  white-space: nowrap;
  padding-top: 2px;
}
</style>
