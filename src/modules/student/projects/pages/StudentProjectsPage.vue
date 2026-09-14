<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PhCaretRight, PhListChecks, PhWarningCircle } from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BasePageHeader,
  BaseStatsCard,
} from "../../../../shared/components/base";
import ProjectProgressBar from "../../../../components/projects/ProjectProgressBar.vue";
import { useProjectsStore } from "../../../../shared/stores";
import { PROJECT_STATUS_TONES } from "../../../../shared/types";
import { projectStatusLabel } from "../../../../i18n/vocabulary";
import { formatIsoDate } from "../../../../shared/utils/date";
import { useAuthStore } from "../../../../modules/authentication";

/**
 * The projects a member is on — a way in, and nothing more.
 *
 * The first version of this page put the full project detail in a panel beside
 * the list, so everything about every project competed for the same screen and
 * the board had nowhere to go. The list is now compact and the work lives on the
 * project's own page, where the board can have the room it needs.
 *
 * Each card answers only what you need to choose between projects: where it
 * stands, when it is due, and how much of *your* part is done.
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

const projects = computed(() => projectsStore.memberProjects);
const tasks = computed(() => projectsStore.memberProjectTasks);

const myOpenTasks = computed(() => tasks.value.filter((task) => task.status !== "done"));
const myOverdueTasks = computed(() => tasks.value.filter((task) => task.isOverdue));
const myDoneTasks = computed(() => tasks.value.filter((task) => task.status === "done"));

/**
 * The member's own share of a project, which is not the project's progress.
 *
 * `project.progress` counts every task on the board; this counts only the ones
 * assigned to this member. Showing the board figure under "your work" would
 * invite reading somebody else's completed tasks as your own.
 */
function myShare(projectId: string): { done: number; total: number } {
  const mine = tasks.value.filter((task) => task.projectId === projectId);
  return { done: mine.filter((task) => task.status === "done").length, total: mine.length };
}

function overdueOn(projectId: string): number {
  return tasks.value.filter((task) => task.projectId === projectId && task.isOverdue).length;
}

function openProject(projectId: string) {
  void router.push({ name: "student-project-detail", params: { projectId } });
}

function load() {
  return projectsStore.loadMemberWorkspace(memberId.value);
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader :title="$t('projects.studentList.title')" :description="$t('projects.studentList.description')">
      <template #actions>
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="projectsStore.loading"
          @click="load"
        />
        <BaseButton severity="secondary" outlined @click="router.push({ name: 'student-tasks' })">
          <PhListChecks weight="bold" />
          {{ $t("projects.studentTasks.title") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState v-if="projectsStore.errorMessage" :message="projectsStore.errorMessage" @retry="load" />

    <BaseLoading v-if="projectsStore.loading && projects.length === 0" />

    <template v-else>
      <section class="metric-grid">
        <BaseStatsCard
          :label="$t('projects.studentList.metricProjects')"
          :value="String(projects.length)"
          :caption="$t('projects.studentList.metricProjectsCaption')"
        />
        <BaseStatsCard
          :label="$t('projects.studentList.metricOpen')"
          :value="String(myOpenTasks.length)"
          :caption="$t('projects.studentList.metricOpenCaption')"
        />
        <BaseStatsCard
          :label="$t('projects.studentList.metricLate')"
          :value="String(myOverdueTasks.length)"
          :caption="$t('projects.studentList.metricLateCaption')"
        />
        <BaseStatsCard
          :label="$t('projects.studentList.metricDone')"
          :value="String(myDoneTasks.length)"
          :caption="$t('projects.studentList.metricDoneCaption')"
        />
      </section>

      <BaseEmptyState
        v-if="projects.length === 0"
        :title="$t('projects.studentList.emptyTitle')"
        :description="$t('projects.studentList.emptyDescription')"
      />

      <div v-else class="project-grid">
        <BaseCard v-for="project in projects" :key="project.id" class="project-card">
          <button type="button" class="project-card__open" @click="openProject(project.id)">
            <span class="project-card__head">
              <span class="project-card__name">{{ project.name }}</span>
              <BaseBadge :label="projectStatusLabel(project.status)" :tone="PROJECT_STATUS_TONES[project.status]" />
            </span>

            <span class="project-card__description type-meta">
              {{ project.description || $t("projects.studentList.noDescription") }}
            </span>
          </button>

          <ProjectProgressBar :progress="project.progress" compact />

          <p class="project-card__mine type-meta">
            {{
              $t("projects.studentList.yourShare", {
                done: myShare(project.id).done,
                total: myShare(project.id).total,
              })
            }}
            <template v-if="project.deadline">
              · {{ $t("projects.studentList.dueOn", { date: formatIsoDate(project.deadline) }) }}
            </template>
          </p>

          <p v-if="overdueOn(project.id) > 0" class="project-card__late type-meta">
            <PhWarningCircle weight="fill" />
            {{
              overdueOn(project.id) === 1
                ? $t("projects.studentList.lateOne")
                : $t("projects.studentList.lateMany", { count: overdueOn(project.id) })
            }}
          </p>

          <template #footer>
            <BaseButton severity="secondary" text @click="openProject(project.id)">
              {{ $t("projects.studentList.openBoard") }}
              <PhCaretRight weight="bold" />
            </BaseButton>
          </template>
        </BaseCard>
      </div>
    </template>
  </section>
</template>

<style scoped>
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
  align-items: start;
}

.project-card__open {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
  margin-bottom: var(--space-3);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.project-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.project-card__name {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  color: var(--foreground);
}

.project-card__open:hover .project-card__name {
  color: var(--primary);
}

.project-card__description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-card__mine {
  margin: var(--space-3) 0 0;
}

.project-card__late {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin: var(--space-1) 0 0;
  color: var(--danger);
  font-weight: var(--weight-medium);
}

.project-card__late svg {
  width: 13px;
  height: 13px;
}
</style>
