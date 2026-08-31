<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PhArrowRight, PhWarningCircle } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseLoading,
  BasePageHeader,
  BaseStatusPill,
} from "../../../../shared/components/base";
import ProjectActivityFeed from "../../../../components/projects/ProjectActivityFeed.vue";
import ProjectProgressBar from "../../../../components/projects/ProjectProgressBar.vue";
import { useProjectsStore } from "../../../../shared/stores";
import { formatRelativeTime } from "../../../../shared/utils/date";

/**
 * The Project Management overview.
 *
 * Built around what an administrator has to act on, not around statistics: the
 * headline row is four numbers that each imply a decision, and everything below is
 * a list of specific things — overdue tasks, tasks due this week, who is carrying
 * too much — rather than another grid of cards.
 */
const router = useRouter();
const projectsStore = useProjectsStore();

const overview = computed(() => projectsStore.overview);

const projectNames = computed(() =>
  Object.fromEntries(projectsStore.allProjects.map((project) => [project.id, project.name])),
);

/** Only people actually carrying open work belong in a workload list. */
const activeWorkload = computed(() => (overview.value?.workload ?? []).filter((row) => row.assigned > 0).slice(0, 6));

const busiestLoad = computed(() => Math.max(1, ...activeWorkload.value.map((row) => row.open)));

const totalTasks = computed(() =>
  (overview.value?.statusBreakdown ?? []).reduce((total, bucket) => total + bucket.count, 0),
);

function openProject(projectId: string) {
  void router.push({ name: "project-details", params: { projectId } });
}

onMounted(async () => {
  await Promise.all([projectsStore.loadOverview(), projectsStore.loadProjects(), projectsStore.loadMyTasks()]);
});
</script>

<template>
  <div class="page-stack">
    <BasePageHeader
      title="Project management"
      description="What the team is working on, what is late, and who is carrying it."
    >
      <template #actions>
        <BaseButton label="All projects" severity="secondary" @click="router.push({ name: 'projects' })" />
        <BaseButton label="All tasks" @click="router.push({ name: 'project-tasks' })" />
      </template>
    </BasePageHeader>

    <p v-if="projectsStore.errorMessage" class="form-error-banner">{{ projectsStore.errorMessage }}</p>

    <BaseLoading v-if="projectsStore.loading && !overview" />

    <template v-else-if="overview">
      <!--
        Four numbers, each of which is a reason to do something: projects in flight,
        work outstanding, work that has slipped, and work nobody owns.
      -->
      <div class="metric-grid">
        <article class="base-metric-card">
          <p class="base-metric-card__label">Active projects</p>
          <p class="base-metric-card__value">{{ overview.activeProjects }}</p>
          <p class="base-metric-card__caption">
            {{ overview.plannedProjects }} planned · {{ overview.completedProjects }} completed
          </p>
        </article>

        <article class="base-metric-card">
          <p class="base-metric-card__label">Open tasks</p>
          <p class="base-metric-card__value">{{ overview.openTasks }}</p>
          <p class="base-metric-card__caption">of {{ totalTasks }} across every project</p>
        </article>

        <article class="base-metric-card" :class="{ 'base-metric-card--negative': overview.overdueTasks.length > 0 }">
          <p class="base-metric-card__label">Overdue</p>
          <p class="base-metric-card__value">{{ overview.overdueTasks.length }}</p>
          <p class="base-metric-card__caption">{{ overview.dueSoonTasks.length }} more due within a week</p>
        </article>

        <article class="base-metric-card">
          <p class="base-metric-card__label">Unassigned</p>
          <p class="base-metric-card__value">{{ overview.unassignedTasks }}</p>
          <p class="base-metric-card__caption">open tasks with nobody responsible</p>
        </article>
      </div>

      <div class="dashboard-grid">
        <div class="page-stack">
          <BaseCard title="Needs attention" description="Overdue first, then anything due in the next seven days.">
            <BaseEmptyState
              v-if="overview.overdueTasks.length === 0 && overview.dueSoonTasks.length === 0"
              title="Nothing is late"
              description="No task is past its due date and nothing falls due in the next week."
            />

            <ul v-else class="attention-list">
              <li
                v-for="task in [...overview.overdueTasks, ...overview.dueSoonTasks].slice(0, 8)"
                :key="task.id"
                class="attention-list__row"
              >
                <button type="button" class="attention-list__main" @click="openProject(task.projectId)">
                  <span class="attention-list__title">{{ task.title }}</span>
                  <span class="attention-list__meta type-meta">
                    {{ task.projectName }} ·
                    {{ task.assignees.length ? task.assignees.map((a) => a.name).join(', ') : 'Unassigned' }}
                  </span>
                </button>

                <span
                  class="attention-list__due type-meta"
                  :class="{ 'attention-list__due--overdue': task.isOverdue }"
                >
                  <PhWarningCircle v-if="task.isOverdue" weight="fill" />
                  {{ task.dueLabel }}
                </span>
              </li>
            </ul>
          </BaseCard>

          <BaseCard title="Assigned to you" description="Open tasks where you are one of the responsible people.">
            <BaseEmptyState
              v-if="projectsStore.myTasks.length === 0"
              title="Nothing assigned to you"
              description="Tasks you are put on will appear here with their deadlines."
            />

            <ul v-else class="attention-list">
              <li v-for="task in projectsStore.myTasks.slice(0, 6)" :key="task.id" class="attention-list__row">
                <button type="button" class="attention-list__main" @click="openProject(task.projectId)">
                  <span class="attention-list__title">{{ task.title }}</span>
                  <span class="attention-list__meta type-meta">{{ task.projectName }}</span>
                </button>
                <span class="attention-list__due type-meta">{{ task.dueLabel ?? '—' }}</span>
              </li>
            </ul>
          </BaseCard>
        </div>

        <div class="page-stack">
          <BaseCard title="Work in progress" description="Where every open task currently sits.">
            <ul class="status-bars">
              <li v-for="bucket in overview.statusBreakdown" :key="bucket.status" class="status-bars__row">
                <span class="status-bars__label type-label">{{ bucket.label }}</span>
                <span class="progress-bar status-bars__track">
                  <span
                    class="progress-bar__fill"
                    :class="{
                      'progress-bar__fill--danger': bucket.status === 'blocked',
                      'progress-bar__fill--warning': bucket.status === 'review',
                      'progress-bar__fill--success': bucket.status === 'done',
                    }"
                    :style="{ width: `${totalTasks ? (bucket.count / totalTasks) * 100 : 0}%` }"
                  />
                </span>
                <span class="status-bars__count type-numeric">{{ bucket.count }}</span>
              </li>
            </ul>
          </BaseCard>

          <BaseCard title="Team workload" description="Open tasks per person, busiest first.">
            <BaseEmptyState
              v-if="activeWorkload.length === 0"
              title="Nothing assigned yet"
              description="Assign tasks to members and their load will show here."
            />

            <ul v-else class="status-bars">
              <li v-for="row in activeWorkload" :key="row.participant.id" class="status-bars__row">
                <span class="status-bars__label type-label">{{ row.participant.name }}</span>
                <span class="progress-bar status-bars__track">
                  <span
                    class="progress-bar__fill"
                    :class="{ 'progress-bar__fill--danger': row.overdue > 0 }"
                    :style="{ width: `${(row.open / busiestLoad) * 100}%` }"
                  />
                </span>
                <span class="status-bars__count type-numeric">{{ row.open }}</span>
              </li>
            </ul>

            <template #footer>
              <BaseButton label="Team and assignments" text @click="router.push({ name: 'project-team' })">
                Team and assignments
                <PhArrowRight weight="bold" />
              </BaseButton>
            </template>
          </BaseCard>
        </div>
      </div>

      <BaseCard title="Recently updated" description="The projects that moved most recently.">
        <BaseEmptyState
          v-if="overview.recentlyUpdated.length === 0"
          title="No projects yet"
          description="Create the first project to start tracking the team's work."
        />

        <ul v-else class="recent-projects">
          <li v-for="project in overview.recentlyUpdated" :key="project.id" class="recent-projects__row">
            <button type="button" class="recent-projects__main" @click="openProject(project.id)">
              <span class="recent-projects__name">{{ project.name }}</span>
              <span class="recent-projects__meta type-meta">
                {{ project.owner }} · updated {{ formatRelativeTime(project.lastActivityAt) }}
              </span>
            </button>

            <BaseStatusPill
              v-if="project.isOverdue"
              tone="danger"
              label="Past deadline"
              class="recent-projects__pill"
            />

            <div class="recent-projects__progress">
              <ProjectProgressBar :progress="project.progress" compact />
            </div>
          </li>
        </ul>
      </BaseCard>

      <BaseCard title="Recent activity" description="The last things that happened across every project.">
        <ProjectActivityFeed :events="overview.recentActivity" show-project :project-names="projectNames" />
        <template #footer>
          <BaseButton label="Full activity log" text @click="router.push({ name: 'project-activity' })" />
        </template>
      </BaseCard>
    </template>
  </div>
</template>

<style scoped>
.attention-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.attention-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.attention-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.attention-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.attention-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attention-list__main:hover .attention-list__title {
  color: var(--primary);
}

.attention-list__due {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex: none;
  white-space: nowrap;
}

.attention-list__due svg {
  width: 13px;
  height: 13px;
}

.attention-list__due--overdue {
  color: var(--danger);
  font-weight: var(--weight-medium);
}

.status-bars {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.status-bars__row {
  display: grid;
  grid-template-columns: minmax(80px, 110px) minmax(0, 1fr) 32px;
  align-items: center;
  gap: var(--space-3);
}

.status-bars__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-bars__track {
  display: block;
}

.status-bars__count {
  text-align: right;
  font-size: var(--text-sm);
  color: var(--foreground-secondary);
}

.recent-projects {
  margin: 0;
  padding: 0;
  list-style: none;
}

.recent-projects__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 140px;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.recent-projects__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.recent-projects__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.recent-projects__name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.recent-projects__main:hover .recent-projects__name {
  color: var(--primary);
}

.recent-projects__pill {
  justify-self: end;
}

@media (max-width: 900px) {
  .recent-projects__row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
  }

  .recent-projects__pill {
    justify-self: start;
  }
}
</style>
