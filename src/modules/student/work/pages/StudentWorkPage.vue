<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PhNotePencil, PhWarningCircle } from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BasePageHeader,
  BaseSelect,
} from "../../../../shared/components/base";
import { useProjectsStore } from "../../../../shared/stores";
import type { ProjectTaskSummary, TaskStatus } from "../../../../shared/types";
import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_PRIORITY_TONES,
  TASK_STATUS_OPTIONS,
} from "../../../../shared/types";
import { formatIsoDate } from "../../../../shared/utils/date";
import { useAuthStore } from "../../../../modules/authentication";

/**
 * The work a member has been assigned, and nothing else.
 *
 * Members are put on project tasks and log journal hours against projects, but
 * until now had no way to see either — the whole project workspace was
 * administrator-only, so the person doing the work could not see what they were
 * meant to be doing.
 *
 * This is deliberately not a small copy of that workspace. A member can see
 * their own tasks and move them along; they cannot create or delete work,
 * reassign anything, see anybody else's load, or open a project's board. Those
 * stay with the people who plan the work.
 */
const router = useRouter();
const authStore = useAuthStore();
const projectsStore = useProjectsStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization — see the note on
 * `authStore.currentMemberId`.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

/** Tasks grouped under the project they belong to. */
const groups = computed(() => {
  const byProject = new Map<string, { projectId: string; projectName: string; tasks: ProjectTaskSummary[] }>();

  for (const task of projectsStore.memberTasks) {
    const group = byProject.get(task.projectId) ?? {
      projectId: task.projectId,
      projectName: task.projectName,
      tasks: [],
    };

    group.tasks.push(task);
    byProject.set(task.projectId, group);
  }

  return [...byProject.values()];
});

const overdue = computed(() => projectsStore.memberTasks.filter((task) => task.isOverdue));

const dueSoon = computed(() =>
  projectsStore.memberTasks.filter((task) => !task.isOverdue && task.dueLabel !== null),
);

function load() {
  return projectsStore.loadMemberTasks(memberId.value);
}

function changeStatus(taskId: string, status: TaskStatus) {
  void projectsStore.moveMemberTask(taskId, status, memberId.value);
}

/** The journal is written per project, so this is the natural next step. */
function writeEntry() {
  void router.push({ name: "student-daily-log" });
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="My Work"
      description="Tasks you have been assigned across the team's projects."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="projectsStore.loading" @click="load" />
        <BaseButton @click="writeEntry">
          <PhNotePencil weight="bold" />
          Write today's entry
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="projectsStore.errorMessage"
      :message="projectsStore.errorMessage"
      @retry="load"
    />

    <BaseLoading v-if="projectsStore.loading && projectsStore.memberTasks.length === 0" />

    <template v-else>
      <!-- Anything late comes before the full list; it is the only urgent thing here. -->
      <BaseCard
        v-if="overdue.length > 0"
        title="Past its deadline"
        description="These were due before today. Tell your monitor if something is blocking you."
      >
        <ul class="work-list">
          <li v-for="task in overdue" :key="task.id" class="work-list__row work-list__row--late">
            <div class="work-list__main">
              <span class="work-list__title">{{ task.title }}</span>
              <span class="type-meta">{{ task.projectName }}</span>
            </div>
            <span class="work-list__late type-meta">
              <PhWarningCircle weight="fill" />
              {{ task.dueLabel }}
            </span>
          </li>
        </ul>
      </BaseCard>

      <BaseCard
        title="Assigned to you"
        :description="
          projectsStore.memberTasks.length
            ? `${projectsStore.memberTasks.length} open ${projectsStore.memberTasks.length === 1 ? 'task' : 'tasks'} across ${groups.length} ${groups.length === 1 ? 'project' : 'projects'}${dueSoon.length ? ` · ${dueSoon.length} due soon` : ''}`
            : 'Work assigned to you appears here.'
        "
      >
        <BaseEmptyState
          v-if="projectsStore.memberTasks.length === 0 && !projectsStore.errorMessage"
          title="Nothing assigned to you"
          description="When somebody puts you on a project task it shows up here, with its deadline and where it stands."
        />

        <div v-for="group in groups" :key="group.projectId" class="work-group">
          <p class="work-group__name type-eyebrow">{{ group.projectName }}</p>

          <ul class="work-list">
            <li v-for="task in group.tasks" :key="task.id" class="work-list__row">
              <div class="work-list__main">
                <span class="work-list__title">{{ task.title }}</span>
                <span v-if="task.description" class="work-list__note type-meta">{{ task.description }}</span>
              </div>

              <BaseBadge
                :label="PROJECT_PRIORITY_LABELS[task.priority]"
                :tone="PROJECT_PRIORITY_TONES[task.priority]"
              />

              <span class="work-list__due type-meta" :class="{ 'work-list__due--overdue': task.isOverdue }">
                {{ task.dueDate ? formatIsoDate(task.dueDate) : 'No deadline' }}
                <template v-if="task.dueLabel"> · {{ task.dueLabel }}</template>
              </span>

              <!--
                Members move their own work along. They cannot reassign it or
                change anybody else's — that stays with whoever plans the work.
              -->
              <BaseSelect
                :model-value="task.status"
                :options="TASK_STATUS_OPTIONS"
                @update:model-value="changeStatus(task.id, $event as TaskStatus)"
              />
            </li>
          </ul>
        </div>

        <template v-if="projectsStore.memberTasks.length > 0" #footer>
          <p class="type-meta">
            Changing a status here is visible to the coordination team straight away.
          </p>
        </template>
      </BaseCard>
    </template>
  </section>
</template>

<style scoped>
.work-group:not(:first-of-type) {
  margin-top: var(--space-5);
}

.work-group__name {
  margin: 0 0 var(--space-2);
  color: var(--foreground-secondary);
}

.work-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.work-list__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(150px, auto) 150px;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.work-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.work-list__row--late {
  grid-template-columns: minmax(0, 1fr) auto;
}

.work-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.work-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.work-list__note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-list__due {
  white-space: nowrap;
}

.work-list__due--overdue,
.work-list__late {
  color: var(--danger);
  font-weight: var(--weight-medium);
}

.work-list__late {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  white-space: nowrap;
}

.work-list__late svg {
  width: 14px;
  height: 14px;
}

@media (max-width: 900px) {
  .work-list__row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: var(--space-2);
  }
}
</style>
