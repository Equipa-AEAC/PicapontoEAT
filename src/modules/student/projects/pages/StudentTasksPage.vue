<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { PhFolders, PhKanban, PhWarningCircle } from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BasePageHeader,
  BaseSelect,
  BaseStatsCard,
} from "../../../../shared/components/base";
import TaskDetailDialog from "../../../../components/projects/TaskDetailDialog.vue";
import TaskFormDialog from "../../../../components/projects/TaskFormDialog.vue";
import { useProjectsStore } from "../../../../shared/stores";
import type { ProjectTaskSummary, TaskFormValues, TaskStatus } from "../../../../shared/types";
import { PROJECT_PRIORITY_TONES } from "../../../../shared/types";
import { t } from "../../../../i18n";
import { projectPriorityLabel, taskStatusLabel } from "../../../../i18n/vocabulary";
import { TASK_STATUS_ORDER } from "../../../../types/projects";
import { formatIsoDate } from "../../../../shared/utils/date";
import { useAuthStore } from "../../../../modules/authentication";

/**
 * Every task assigned to this member, across every project they are on.
 *
 * This is what "My Work" was, moved inside Project management and cut back. The
 * old page rendered each task's description, priority, deadline and a status
 * select on one row, which meant the list you scan to answer "what is next" was
 * as dense as the record you open to answer "what is this". The row now carries
 * only what ranks it — title, project, deadline — and everything else is in the
 * task dialog, which is the same dialog the board opens.
 *
 * Ordering is by urgency, not by project: overdue first, then due, then the rest.
 * Grouping by project is what the Projects page and its boards are for.
 */
const router = useRouter();
const authStore = useAuthStore();
const projectsStore = useProjectsStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

const statusFilter = ref<"open" | "all" | TaskStatus>("open");
const projectFilter = ref<string>("all");

const detailVisible = ref(false);
const formVisible = ref(false);
const removeConfirmVisible = ref(false);
const openedTask = ref<ProjectTaskSummary | null>(null);
const editingTask = ref<ProjectTaskSummary | null>(null);

const allTasks = computed(() => projectsStore.memberProjectTasks);

/*
 * Built from `TASK_STATUS_ORDER` rather than written out, so a new status cannot
 * appear on the board and be missing from this filter - and computed rather than
 * constant, because a module constant would freeze the labels in whichever
 * language happened to be active at import time.
 */
const statusOptions = computed(() => [
  { label: t("projects.studentTasks.filterOpen"), value: "open" },
  ...TASK_STATUS_ORDER.map((status) => ({ label: taskStatusLabel(status), value: status })),
  { label: t("projects.studentTasks.filterEverything"), value: "all" },
]);

const projectOptions = computed(() => [
  { label: t("projects.studentTasks.filterAllProjects"), value: "all" },
  ...projectsStore.memberProjects.map((project) => ({ label: project.name, value: project.id })),
]);

/*
 * What the member may do with the task currently open.
 *
 * Asked per task rather than once for the page: My tasks lists work from several
 * projects, and the member can lead one and merely take part in another.
 */
const openedTaskEditable = computed(
  () => openedTask.value !== null && projectsStore.memberCanEdit(memberId.value, openedTask.value),
);

const openedTaskProjectAssign = computed(() =>
  openedTask.value ? projectsStore.memberCanAssignOthers(openedTask.value.projectId) : false,
);

/** Overdue first, then anything with a deadline, then the rest by title. */
const visibleTasks = computed(() => {
  const rows = allTasks.value.filter((task) => {
    const matchesStatus =
      statusFilter.value === "all"
        ? true
        : statusFilter.value === "open"
          ? task.status !== "done"
          : task.status === statusFilter.value;
    const matchesProject = projectFilter.value === "all" || task.projectId === projectFilter.value;

    return matchesStatus && matchesProject;
  });

  return rows.sort((first, second) => {
    if (first.isOverdue !== second.isOverdue) return first.isOverdue ? -1 : 1;
    if (first.dueDate && second.dueDate) return first.dueDate.localeCompare(second.dueDate);
    if (first.dueDate) return -1;
    if (second.dueDate) return 1;
    return first.title.localeCompare(second.title);
  });
});

const openCount = computed(() => allTasks.value.filter((task) => task.status !== "done").length);
const overdueCount = computed(() => allTasks.value.filter((task) => task.isOverdue).length);
const dueSoonCount = computed(
  () => allTasks.value.filter((task) => !task.isOverdue && task.status !== "done" && task.dueLabel !== null).length,
);
const doneCount = computed(() => allTasks.value.filter((task) => task.status === "done").length);

const hasFilters = computed(() => statusFilter.value !== "open" || projectFilter.value !== "all");

function clearFilters() {
  statusFilter.value = "open";
  projectFilter.value = "all";
}

/* -------------------------------------------------------------- Actions */

function openTask(task: ProjectTaskSummary) {
  openedTask.value = task;
  detailVisible.value = true;
}

function editOpenedTask(task: ProjectTaskSummary) {
  editingTask.value = task;
  detailVisible.value = false;
  formVisible.value = true;
}

async function submitTask(values: TaskFormValues) {
  const saved = await projectsStore.persistMemberTask(memberId.value, values, editingTask.value?.id);

  if (saved) {
    formVisible.value = false;
    editingTask.value = null;
    await projectsStore.loadMemberWorkspace(memberId.value);
  }
}

async function changeStatus(taskId: string, status: TaskStatus) {
  await projectsStore.moveMemberProjectTask(taskId, status, memberId.value);
  openedTask.value = allTasks.value.find((task) => task.id === taskId) ?? null;
}

function requestRemove(task: ProjectTaskSummary) {
  openedTask.value = task;
  detailVisible.value = false;
  removeConfirmVisible.value = true;
}

async function confirmRemove() {
  if (openedTask.value) {
    await projectsStore.removeMemberTask(memberId.value, openedTask.value.id, openedTask.value.projectId);
    await projectsStore.loadMemberWorkspace(memberId.value);
  }

  removeConfirmVisible.value = false;
  openedTask.value = null;
}

function openBoard(projectId: string) {
  void router.push({ name: "student-project-detail", params: { projectId } });
}

function load() {
  return projectsStore.loadMemberWorkspace(memberId.value);
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader :title="$t('projects.studentTasks.title')" :description="$t('projects.studentTasks.description')">
      <template #actions>
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="projectsStore.loading"
          @click="load"
        />
        <BaseButton severity="secondary" outlined @click="router.push({ name: 'student-projects' })">
          <PhFolders weight="bold" />
          {{ $t("projects.studentList.title") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState v-if="projectsStore.errorMessage" :message="projectsStore.errorMessage" @retry="load" />

    <BaseLoading v-if="projectsStore.loading && allTasks.length === 0" />

    <template v-else>
      <section class="metric-grid">
        <BaseStatsCard
          :label="$t('projects.studentTasks.metricOpen')"
          :value="String(openCount)"
          :caption="$t('projects.studentTasks.metricOpenCaption')"
        />
        <BaseStatsCard
          :label="$t('projects.studentTasks.metricLate')"
          :value="String(overdueCount)"
          :caption="
            overdueCount
              ? $t('projects.studentTasks.metricLateCaption')
              : $t('projects.studentTasks.metricNothingLate')
          "
        />
        <BaseStatsCard
          :label="$t('projects.studentTasks.metricSoon')"
          :value="String(dueSoonCount)"
          :caption="$t('projects.studentTasks.metricSoonCaption')"
        />
        <BaseStatsCard
          :label="$t('projects.studentTasks.metricDone')"
          :value="String(doneCount)"
          :caption="$t('projects.studentTasks.metricDoneCaption')"
        />
      </section>

      <BaseCard padding="tight">
        <div class="filter-strip">
          <BaseSelect v-model="statusFilter" :options="statusOptions" />
          <BaseSelect v-model="projectFilter" :options="projectOptions" />
          <BaseButton
            :label="$t('common.actions.clearFilters')"
            severity="secondary"
            outlined
            :disabled="!hasFilters"
            @click="clearFilters"
          />
        </div>
      </BaseCard>

      <BaseCard
        :title="$t('projects.studentTasks.countTitle', visibleTasks.length)"
        :description="$t('projects.studentTasks.countDescription')"
      >
        <BaseEmptyState
          v-if="visibleTasks.length === 0"
          :title="
            hasFilters
              ? $t('projects.studentTasks.emptyFilteredTitle')
              : $t('projects.studentTasks.emptyTitle')
          "
          :description="
            hasFilters
              ? $t('projects.studentTasks.emptyFilteredDescription')
              : $t('projects.studentTasks.emptyDescription')
          "
          :action-label="hasFilters ? $t('common.actions.clearFilters') : undefined"
          @action="clearFilters"
        />

        <ul v-else class="task-list">
          <li
            v-for="task in visibleTasks"
            :key="task.id"
            class="task-list__row"
            :class="{ 'task-list__row--overdue': task.isOverdue }"
          >
            <button type="button" class="task-list__main" @click="openTask(task)">
              <span class="task-list__title">{{ task.title }}</span>
              <span class="type-meta">{{ task.projectName }}</span>
            </button>

            <BaseBadge :label="projectPriorityLabel(task.priority)" :tone="PROJECT_PRIORITY_TONES[task.priority]" />

            <span class="task-list__due type-meta" :class="{ 'task-list__due--overdue': task.isOverdue }">
              <PhWarningCircle v-if="task.isOverdue" weight="fill" />
              {{ task.dueDate ? formatIsoDate(task.dueDate) : $t("common.time.noDeadline") }}
              <template v-if="task.dueLabel"> · {{ task.dueLabel }}</template>
            </span>

            <BaseButton
              severity="secondary"
              text
              size="small"
              :aria-label="$t('projects.task.openBoard', { project: task.projectName })"
              @click="openBoard(task.projectId)"
            >
              <PhKanban weight="bold" />
            </BaseButton>
          </li>
        </ul>
      </BaseCard>
    </template>

    <TaskDetailDialog
      :visible="detailVisible"
      :task="openedTask"
      :can-move="openedTask ? projectsStore.rightsFor(openedTask.projectId).canMoveTasks : false"
      :can-edit="openedTaskEditable"
      :can-remove="openedTaskEditable"
      :busy="projectsStore.saving"
      @update:visible="detailVisible = $event"
      @edit="editOpenedTask"
      @remove="requestRemove"
      @change-status="changeStatus"
    />

    <TaskFormDialog
      :visible="formVisible"
      :task="editingTask"
      :projects="projectsStore.memberProjects"
      :participants="projectsStore.memberParticipants"
      :loading="projectsStore.saving"
      :locked-project-id="editingTask?.projectId ?? null"
      :can-assign-others="openedTaskProjectAssign"
      :self-id="memberId"
      @update:visible="formVisible = $event"
      @submit="submitTask"
    />

    <BaseConfirmDialog
      :visible="removeConfirmVisible"
      :title="$t('projects.remove.title')"
      :message="$t('projects.remove.message', { title: openedTask?.title ?? $t('projects.task.fallbackTitle') })"
      :confirm-label="$t('projects.remove.confirm')"
      :cancel-label="$t('common.actions.cancel')"
      severity="danger"
      :loading="projectsStore.saving"
      @update:visible="removeConfirmVisible = $event"
      @confirm="confirmRemove"
      @cancel="removeConfirmVisible = false"
    />
  </section>
</template>

<style scoped>
.task-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.task-list__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(160px, auto) auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.task-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

/* Late work reads as late at a glance, before any of the text is read. */
.task-list__row--overdue {
  margin-left: calc(var(--space-3) * -1);
  padding-left: var(--space-3);
  border-left: 2px solid var(--danger);
}

.task-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.task-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.task-list__main:hover .task-list__title {
  color: var(--primary);
}

.task-list__due {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  white-space: nowrap;
}

.task-list__due svg {
  width: 13px;
  height: 13px;
}

.task-list__due--overdue {
  color: var(--danger);
  font-weight: var(--weight-medium);
}

@media (max-width: 900px) {
  .task-list__row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: var(--space-2);
  }
}
</style>
