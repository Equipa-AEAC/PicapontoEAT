<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { PhPencilSimple, PhPlus, PhTrash, PhWarningCircle } from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseLoading,
  BasePageHeader,
  BaseSearchBar,
  BaseSelect,
  BaseTable,
  BaseTableColumn,
  BaseToolbar,
} from "../../../../shared/components/base";
import TaskFormDialog from "../../../../components/projects/TaskFormDialog.vue";
import { useProjectsStore } from "../../../../shared/stores";
import type { ProjectPriority, ProjectTaskSummary, TaskFormValues, TaskStatus } from "../../../../shared/types";
import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_PRIORITY_TONES,
  TASK_STATUS_OPTIONS,
  UNASSIGNED_ASSIGNEE,
} from "../../../../shared/types";
import { formatIsoDate } from "../../../../shared/utils/date";

/**
 * Every task across every project, in one filterable table.
 *
 * This is the cross-project view the board deliberately cannot give: "what is
 * overdue everywhere", "what is Ana carrying", "what has nobody picked up".
 */
const router = useRouter();
const projectsStore = useProjectsStore();

const showForm = ref(false);
const editing = ref<ProjectTaskSummary | null>(null);
const archiveTarget = ref<ProjectTaskSummary | null>(null);

const statusOptions = [{ label: "All statuses", value: "all" }, ...TASK_STATUS_OPTIONS];
const priorityOptions = [{ label: "All priorities", value: "all" }, ...PROJECT_PRIORITY_OPTIONS];
const dueOptions = [
  { label: "Any deadline", value: "all" },
  { label: "Overdue", value: "overdue" },
  { label: "Due within a week", value: "soon" },
  { label: "No deadline", value: "none" },
];

const assigneeOptions = computed(() => [
  { label: "Anyone", value: "all" },
  // Unowned work is the queue most likely to slip, so it is selectable here too.
  { label: "Nobody assigned", value: UNASSIGNED_ASSIGNEE },
  ...projectsStore.participants.map((participant) => ({ label: participant.name, value: participant.id })),
]);

let searchTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => projectsStore.taskFilters.query,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void projectsStore.loadTasks(), 250);
  },
);

watch(
  () => [
    projectsStore.taskFilters.projectId,
    projectsStore.taskFilters.status,
    projectsStore.taskFilters.priority,
    projectsStore.taskFilters.assigneeId,
    projectsStore.taskFilters.due,
  ],
  () => void projectsStore.loadTasks(),
);

const overdueCount = computed(() => projectsStore.tasks.filter((task) => task.isOverdue).length);

function openCreate() {
  editing.value = null;
  showForm.value = true;
}

function openEdit(task: ProjectTaskSummary) {
  editing.value = task;
  showForm.value = true;
}

async function submit(values: TaskFormValues) {
  const saved = await projectsStore.persistTask(values, editing.value?.id);

  if (saved) {
    showForm.value = false;
  }
}

async function confirmArchive() {
  const target = archiveTarget.value;
  archiveTarget.value = null;

  if (target) {
    await projectsStore.removeTask(target.id, target.projectId);
  }
}

function clearFilters() {
  projectsStore.resetTaskFilters();
  void projectsStore.loadTasks();
}

onMounted(() => void projectsStore.loadTasks());
</script>

<template>
  <div class="page-stack">
    <BasePageHeader title="Tasks" description="Every work item across every project, with its owner and deadline.">
      <template #actions>
        <BaseButton @click="openCreate">
          <PhPlus weight="bold" />
          New task
        </BaseButton>
      </template>
    </BasePageHeader>

    <p v-if="projectsStore.errorMessage" class="form-error-banner">{{ projectsStore.errorMessage }}</p>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="projectsStore.taskFilters.query" placeholder="Search tasks" />
          <BaseSelect
            :model-value="projectsStore.taskFilters.projectId"
            :options="projectsStore.projectOptions"
            @update:model-value="projectsStore.taskFilters.projectId = $event as string"
          />
          <BaseSelect
            :model-value="projectsStore.taskFilters.status"
            :options="statusOptions"
            @update:model-value="projectsStore.taskFilters.status = $event as TaskStatus | 'all'"
          />
          <BaseSelect
            :model-value="projectsStore.taskFilters.priority"
            :options="priorityOptions"
            @update:model-value="projectsStore.taskFilters.priority = $event as ProjectPriority | 'all'"
          />
          <BaseSelect
            :model-value="projectsStore.taskFilters.assigneeId"
            :options="assigneeOptions"
            @update:model-value="projectsStore.taskFilters.assigneeId = $event as string"
          />
          <BaseSelect
            :model-value="projectsStore.taskFilters.due"
            :options="dueOptions"
            @update:model-value="projectsStore.taskFilters.due = $event as 'all' | 'overdue' | 'soon' | 'none'"
          />
        </div>
      </template>

      <template #right>
        <span v-if="overdueCount > 0" class="status-pill status-pill--danger">
          <PhWarningCircle weight="fill" />
          {{ overdueCount }} overdue
        </span>
        <BaseButton v-if="projectsStore.hasTaskFilters" label="Clear" severity="secondary" text @click="clearFilters" />
      </template>
    </BaseToolbar>

    <BaseLoading v-if="projectsStore.loading && projectsStore.tasks.length === 0" />

    <BaseCard v-else>
      <BaseEmptyState
        v-if="projectsStore.tasks.length === 0"
        title="No tasks match"
        :description="
          projectsStore.hasTaskFilters
            ? 'Nothing matches the current filters. Clear them to see every task.'
            : 'Create a task and assign it to somebody on the team.'
        "
        :action-label="projectsStore.hasTaskFilters ? 'Clear filters' : 'New task'"
        @action="projectsStore.hasTaskFilters ? clearFilters() : openCreate()"
      />

      <BaseTable v-else :value="projectsStore.tasks" data-key="id" :loading="projectsStore.loading" paginator :rows="15">
        <BaseTableColumn header="Task" field="title" sortable>
          <template #body="{ data }">
            <button type="button" class="task-cell" @click="openEdit(data as ProjectTaskSummary)">
              <span class="task-cell__title">{{ (data as ProjectTaskSummary).title }}</span>
              <span class="task-cell__project type-meta">{{ (data as ProjectTaskSummary).projectName }}</span>
            </button>
          </template>
        </BaseTableColumn>

        <BaseTableColumn header="Status" width="140px">
          <template #body="{ data }">
            <BaseSelect
              :model-value="(data as ProjectTaskSummary).status"
              :options="TASK_STATUS_OPTIONS"
              @update:model-value="
                projectsStore.moveTask(
                  (data as ProjectTaskSummary).id,
                  $event as TaskStatus,
                  (data as ProjectTaskSummary).projectId,
                )
              "
            />
          </template>
        </BaseTableColumn>

        <BaseTableColumn header="Priority" width="110px">
          <template #body="{ data }">
            <BaseBadge
              :label="PROJECT_PRIORITY_LABELS[(data as ProjectTaskSummary).priority]"
              :tone="PROJECT_PRIORITY_TONES[(data as ProjectTaskSummary).priority]"
            />
          </template>
        </BaseTableColumn>

        <BaseTableColumn header="Responsible" width="200px">
          <template #body="{ data }">
            <span v-if="(data as ProjectTaskSummary).assignees.length === 0" class="task-cell__unassigned">
              <PhWarningCircle weight="regular" />
              Nobody assigned
            </span>
            <!--
              Task → member. Only roster members have a record to open; staff
              participants have no member page, so they stay as plain text
              rather than a link that would 404.
            -->
            <span v-else class="assignee-cell">
              <template v-for="(person, index) in (data as ProjectTaskSummary).assignees" :key="person.id">
                <button
                  v-if="person.source === 'member'"
                  type="button"
                  class="assignee-cell__link"
                  @click.stop="router.push({ name: 'member-details', params: { memberId: person.id } })"
                >
                  {{ person.name }}
                </button>
                <span v-else>{{ person.name }}</span>
                <span v-if="index < (data as ProjectTaskSummary).assignees.length - 1">, </span>
              </template>
            </span>
          </template>
        </BaseTableColumn>

        <BaseTableColumn header="Due" field="dueDate" sortable width="150px">
          <template #body="{ data }">
            <span class="cell-stack">
              <span :class="{ 'task-cell__overdue': (data as ProjectTaskSummary).isOverdue }">
                {{ formatIsoDate((data as ProjectTaskSummary).dueDate) }}
              </span>
              <small v-if="(data as ProjectTaskSummary).dueLabel">
                {{ (data as ProjectTaskSummary).dueLabel }}
              </small>
            </span>
          </template>
        </BaseTableColumn>

        <BaseTableColumn header="" width="90px">
          <template #body="{ data }">
            <div class="icon-actions">
              <button
                type="button"
                class="icon-actions__button"
                aria-label="Open project"
                title="Open project"
                @click.stop="
                  router.push({
                    name: 'project-details',
                    params: { projectId: (data as ProjectTaskSummary).projectId },
                  })
                "
              >
                <PhPencilSimple weight="regular" />
              </button>
              <button
                type="button"
                class="icon-actions__button icon-actions__button--danger"
                aria-label="Archive task"
                title="Archive task"
                @click.stop="archiveTarget = data as ProjectTaskSummary"
              >
                <PhTrash weight="regular" />
              </button>
            </div>
          </template>
        </BaseTableColumn>
      </BaseTable>
    </BaseCard>

    <TaskFormDialog
      :visible="showForm"
      :task="editing"
      :projects="projectsStore.allProjects"
      :participants="projectsStore.participants"
      :loading="projectsStore.saving"
      @update:visible="showForm = $event"
      @submit="submit"
    />

    <BaseConfirmDialog
      :visible="archiveTarget !== null"
      title="Archive task"
      :message="`${archiveTarget?.title ?? 'This task'} will be removed from the board. It stays in the project's history.`"
      confirm-label="Archive"
      @update:visible="archiveTarget = null"
      @confirm="confirmArchive"
      @cancel="archiveTarget = null"
    />
  </div>
</template>

<style scoped>
.task-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.task-cell__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.task-cell:hover .task-cell__title {
  color: var(--primary);
}

/*
 * Unowned work is a state to notice, not muted body text. It gets the same
 * warning colour the Team page uses so the two views agree at a glance.
 */
.task-cell__unassigned {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--warning-foreground);
  font-weight: var(--weight-medium);
}

.task-cell__unassigned svg {
  width: 13px;
  height: 13px;
}

.task-cell__overdue {
  color: var(--danger);
  font-weight: var(--weight-medium);
}

.assignee-cell__link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--foreground);
  font: inherit;
  cursor: pointer;
}

.assignee-cell__link:hover {
  color: var(--primary);
  text-decoration: underline;
}
</style>
