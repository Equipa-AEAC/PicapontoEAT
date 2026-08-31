<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  PhArchive,
  PhArrowCounterClockwise,
  PhArrowLeft,
  PhKanban,
  PhListChecks,
  PhPencilSimple,
  PhPlus,
  PhPulse,
  PhTrash,
} from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseLoading,
  BasePageHeader,
  BaseSelect,
  BaseTabs,
} from "../../../../shared/components/base";
import type { BaseTabItem } from "../../../../shared/components/base";
import ProjectActivityFeed from "../../../../components/projects/ProjectActivityFeed.vue";
import ProjectFormDialog from "../../../../components/projects/ProjectFormDialog.vue";
import ProjectProgressBar from "../../../../components/projects/ProjectProgressBar.vue";
import TaskBoard from "../../../../components/projects/TaskBoard.vue";
import TaskFormDialog from "../../../../components/projects/TaskFormDialog.vue";
import { useProjectsStore } from "../../../../shared/stores";
import type { ProjectFormValues, ProjectTaskSummary, TaskFormValues, TaskStatus } from "../../../../shared/types";
import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_PRIORITY_TONES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  TASK_STATUS_OPTIONS,
} from "../../../../shared/types";
import { formatIsoDate, formatRelativeTime } from "../../../../shared/utils/date";

/**
 * One project's workspace.
 *
 * Two task views are offered and no more: a board, for moving work along, and a
 * list, for scanning deadlines and owners. A timeline view would need a third data
 * shape and answer a question — "when is this scheduled" — that a school project
 * with a single deadline does not really ask.
 */
const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();

/** The journal panel is opt-in: most visits are about the board, not the write-ups. */
const showJournal = ref(false);

async function toggleJournal() {
  showJournal.value = !showJournal.value;

  if (showJournal.value && projectsStore.projectJournal.length === 0) {
    await projectsStore.loadProjectJournal(projectId.value);
  }
}

const projectId = computed(() => String(route.params.projectId));
const project = computed(() => projectsStore.selectedProject);

const activeTab = ref("board");
const showProjectForm = ref(false);
const showTaskForm = ref(false);
const editingTask = ref<ProjectTaskSummary | null>(null);
const taskDefaultStatus = ref<TaskStatus>("todo");
const archiveProjectConfirm = ref(false);
const archiveTaskTarget = ref<ProjectTaskSummary | null>(null);

const boardTasks = computed(() => projectsStore.board.flatMap((column) => column.tasks));

const tabs = computed<BaseTabItem[]>(() => [
  { value: "board", label: "Board", icon: PhKanban, badge: boardTasks.value.length },
  { value: "list", label: "List", icon: PhListChecks },
  { value: "activity", label: "Activity", icon: PhPulse, badge: projectsStore.activity.length },
]);

/** List view: same tasks as the board, ordered by deadline rather than by column. */
const listTasks = computed(() =>
  [...boardTasks.value].sort((first, second) => {
    if (first.dueDate && second.dueDate) return first.dueDate.localeCompare(second.dueDate);
    if (first.dueDate) return -1;
    if (second.dueDate) return 1;
    return first.title.localeCompare(second.title);
  }),
);

watch(projectId, (id) => void projectsStore.loadProject(id));

function openCreateTask(status: TaskStatus = "todo") {
  editingTask.value = null;
  taskDefaultStatus.value = status;
  showTaskForm.value = true;
}

function openEditTask(task: ProjectTaskSummary) {
  editingTask.value = task;
  showTaskForm.value = true;
}

async function submitTask(values: TaskFormValues) {
  const saved = await projectsStore.persistTask(values, editingTask.value?.id);

  if (saved) {
    showTaskForm.value = false;
  }
}

async function submitProject(values: ProjectFormValues) {
  const saved = await projectsStore.persistProject(values, projectId.value);

  if (saved) {
    showProjectForm.value = false;
  }
}

async function confirmArchiveTask() {
  const target = archiveTaskTarget.value;
  archiveTaskTarget.value = null;

  if (target) {
    await projectsStore.removeTask(target.id, projectId.value);
  }
}

async function confirmArchiveProject() {
  archiveProjectConfirm.value = false;
  await projectsStore.archive(projectId.value);
}

onMounted(async () => {
  await Promise.all([projectsStore.loadProject(projectId.value), projectsStore.loadProjects()]);
});
</script>

<template>
  <div class="page-stack">
    <BaseLoading v-if="projectsStore.loadingDetails && !project" />

    <BaseEmptyState
      v-else-if="!project"
      title="Project not found"
      description="It may have been removed, or the link is out of date."
      action-label="Back to projects"
      @action="router.push({ name: 'projects' })"
    />

    <template v-else>
      <BaseButton class="detail-back" severity="secondary" text @click="router.push({ name: 'projects' })">
        <PhArrowLeft weight="bold" />
        Projects
      </BaseButton>

      <BasePageHeader :title="project.name" :description="project.description || undefined">
        <template #actions>
          <BaseButton severity="secondary" @click="showProjectForm = true">
            <PhPencilSimple weight="regular" />
            Edit
          </BaseButton>
          <BaseButton
            v-if="project.status !== 'archived'"
            severity="secondary"
            @click="archiveProjectConfirm = true"
          >
            <PhArchive weight="regular" />
            Archive
          </BaseButton>
          <BaseButton v-else severity="secondary" @click="projectsStore.restore(project.id)">
            <PhArrowCounterClockwise weight="regular" />
            Restore
          </BaseButton>
          <BaseButton @click="openCreateTask()">
            <PhPlus weight="bold" />
            New task
          </BaseButton>
        </template>
      </BasePageHeader>

      <p v-if="projectsStore.errorMessage" class="form-error-banner">{{ projectsStore.errorMessage }}</p>

      <!--
        The project's facts, as a definition grid rather than a row of stat cards.
        These are attributes of one thing, so they read as a record, not as metrics.
      -->
      <BaseCard>
        <div class="project-facts">
          <div class="project-facts__item">
            <span class="type-label">Status</span>
            <BaseBadge :label="PROJECT_STATUS_LABELS[project.status]" :tone="PROJECT_STATUS_TONES[project.status]" />
          </div>

          <div class="project-facts__item">
            <span class="type-label">Priority</span>
            <BaseBadge
              :label="PROJECT_PRIORITY_LABELS[project.priority]"
              :tone="PROJECT_PRIORITY_TONES[project.priority]"
            />
          </div>

          <div class="project-facts__item">
            <span class="type-label">Responsible</span>
            <span class="project-facts__value">{{ project.owner }}</span>
          </div>

          <div class="project-facts__item">
            <span class="type-label">Started</span>
            <span class="project-facts__value type-numeric">{{ formatIsoDate(project.startDate) }}</span>
          </div>

          <div class="project-facts__item">
            <span class="type-label">Deadline</span>
            <span class="project-facts__value type-numeric" :class="{ 'project-facts__value--danger': project.isOverdue }">
              {{ formatIsoDate(project.deadline) }}
            </span>
          </div>

          <div class="project-facts__item">
            <span class="type-label">Journal hours</span>
            <!--
              The number used to be a dead end: seeing what was behind it meant
              going to Reports and rebuilding the filter by hand.
            -->
            <button
              v-if="project.journalEntries > 0"
              type="button"
              class="project-facts__value project-facts__value--link type-numeric"
              :aria-expanded="showJournal"
              @click="toggleJournal"
            >
              {{ project.journalHours }}
              <small class="type-meta">
                from {{ project.journalEntries }}
                {{ project.journalEntries === 1 ? 'entry' : 'entries' }} · {{ showJournal ? 'hide' : 'read them' }}
              </small>
            </button>
            <span v-else class="project-facts__value type-numeric">
              0
              <small class="type-meta">nobody has written about this project</small>
            </span>
          </div>

          <div class="project-facts__item project-facts__item--wide">
            <span class="type-label">Progress</span>
            <ProjectProgressBar :progress="project.progress" />
          </div>
        </div>
      </BaseCard>

      <div class="dashboard-grid">
        <BaseCard class="project-work">
          <BaseTabs v-model="activeTab" :tabs="tabs">
            <template #board>
              <BaseEmptyState
                v-if="boardTasks.length === 0"
                title="No tasks yet"
                description="Break the project into tasks so progress and deadlines can be tracked."
                action-label="Add the first task"
                @action="openCreateTask()"
              />
              <TaskBoard
                v-else
                :columns="projectsStore.board"
                @move="(taskId, status) => projectsStore.moveTask(taskId, status, projectId)"
                @open="openEditTask"
                @add="openCreateTask"
              />
            </template>

            <template #list>
              <BaseEmptyState
                v-if="listTasks.length === 0"
                title="No tasks yet"
                description="Break the project into tasks so progress and deadlines can be tracked."
                action-label="Add the first task"
                @action="openCreateTask()"
              />

              <ul v-else class="task-list">
                <li v-for="task in listTasks" :key="task.id" class="task-list__row">
                  <div class="task-list__main">
                    <button type="button" class="task-list__title" @click="openEditTask(task)">{{ task.title }}</button>
                    <p class="task-list__meta type-meta">
                      {{ task.assignees.length ? task.assignees.map((a) => a.name).join(', ') : 'Unassigned' }}
                      <template v-if="task.dueLabel">
                        · <span :class="{ 'task-list__overdue': task.isOverdue }">{{ task.dueLabel }}</span>
                      </template>
                    </p>
                  </div>

                  <!-- Status is changed inline; no need to open the form for it. -->
                  <BaseSelect
                    class="task-list__status"
                    :model-value="task.status"
                    :options="TASK_STATUS_OPTIONS"
                    @update:model-value="projectsStore.moveTask(task.id, $event as TaskStatus, projectId)"
                  />

                  <div class="icon-actions">
                    <button
                      type="button"
                      class="icon-actions__button"
                      aria-label="Edit task"
                      title="Edit task"
                      @click="openEditTask(task)"
                    >
                      <PhPencilSimple weight="regular" />
                    </button>
                    <button
                      type="button"
                      class="icon-actions__button icon-actions__button--danger"
                      aria-label="Archive task"
                      title="Archive task"
                      @click="archiveTaskTarget = task"
                    >
                      <PhTrash weight="regular" />
                    </button>
                  </div>
                </li>
              </ul>
            </template>

            <template #activity>
              <ProjectActivityFeed
                :events="projectsStore.activity"
                empty-title="Nothing has happened yet"
                empty-description="Creating or moving a task on this project records an entry here."
              />
            </template>
          </BaseTabs>
        </BaseCard>

        <div class="page-stack">
          <BaseCard title="Team" :description="`${project.participants.length} people on this project`">
            <BaseEmptyState
              v-if="project.participants.length === 0"
              title="Nobody assigned"
              description="Edit the project to put members and staff on it."
              action-label="Assign people"
              @action="showProjectForm = true"
            />

            <ul v-else class="team-list">
              <li v-for="participant in project.participants" :key="participant.id" class="team-list__row">
                <span class="team-list__name">{{ participant.name }}</span>
                <span class="team-list__role type-meta">
                  {{ participant.role }}<template v-if="participant.isExternal"> · External</template>
                </span>
              </li>
            </ul>
          </BaseCard>

          <BaseCard
        v-if="showJournal"
        title="Journal entries"
        description="What people wrote about their time on this project."
      >
        <BaseLoading v-if="projectsStore.loading && projectsStore.projectJournal.length === 0" />

        <BaseEmptyState
          v-else-if="projectsStore.projectJournal.length === 0"
          title="Nothing written yet"
          description="Journal entries tagged to this project will appear here."
        />

        <ul v-else class="journal-list">
          <li v-for="entry in projectsStore.projectJournal" :key="entry.id" class="journal-list__row">
            <div class="journal-list__head">
              <span class="journal-list__who">{{ entry.memberName }}</span>
              <span class="type-meta">{{ formatIsoDate(entry.date) }} · {{ entry.hours }}h</span>
            </div>
            <p class="journal-list__body">{{ entry.activities }}</p>
            <p v-if="entry.difficulties" class="journal-list__aside type-meta">
              Difficulties: {{ entry.difficulties }}
            </p>
          </li>
        </ul>

        <template #footer>
          <BaseButton
            label="Open the full journal"
            severity="secondary"
            text
            @click="router.push({ name: 'reports' })"
          />
        </template>
      </BaseCard>

      <BaseCard title="Latest updates">
            <ProjectActivityFeed
              :events="projectsStore.activity.slice(0, 5)"
              empty-title="No updates yet"
              empty-description="Activity on this project appears here."
            />
            <template #footer>
              <span class="type-meta">Last change {{ formatRelativeTime(project.lastActivityAt) }}</span>
            </template>
          </BaseCard>
        </div>
      </div>
    </template>

    <ProjectFormDialog
      :visible="showProjectForm"
      :project="project"
      :participants="projectsStore.participants"
      :loading="projectsStore.saving"
      @update:visible="showProjectForm = $event"
      @submit="submitProject"
    />

    <TaskFormDialog
      :visible="showTaskForm"
      :task="editingTask"
      :projects="projectsStore.allProjects"
      :participants="projectsStore.participants"
      :loading="projectsStore.saving"
      :locked-project-id="projectId"
      :default-status="taskDefaultStatus"
      @update:visible="showTaskForm = $event"
      @submit="submitTask"
    />

    <BaseConfirmDialog
      :visible="archiveTaskTarget !== null"
      title="Archive task"
      :message="`${archiveTaskTarget?.title ?? 'This task'} will be removed from the board. It stays in the project's history.`"
      confirm-label="Archive"
      @update:visible="archiveTaskTarget = null"
      @confirm="confirmArchiveTask"
      @cancel="archiveTaskTarget = null"
    />

    <BaseConfirmDialog
      :visible="archiveProjectConfirm"
      title="Archive project"
      message="This project will be hidden from the default list. Its tasks and activity are kept and it can be restored at any time."
      confirm-label="Archive"
      @update:visible="archiveProjectConfirm = false"
      @confirm="confirmArchiveProject"
      @cancel="archiveProjectConfirm = false"
    />
  </div>
</template>

<style scoped>
.detail-back {
  align-self: flex-start;
}

.project-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-4) var(--space-6);
}

.project-facts__item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-items: flex-start;
  min-width: 0;
}

.project-facts__item--wide {
  grid-column: span 2;
  min-width: 180px;
}

.project-facts__value {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--foreground);
}

.project-facts__value--danger {
  color: var(--danger);
  font-weight: var(--weight-medium);
}

.task-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.task-list__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.task-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.task-list__main {
  min-width: 0;
}

.task-list__title {
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.task-list__title:hover {
  color: var(--primary);
}

.task-list__overdue {
  color: var(--danger);
  font-weight: var(--weight-medium);
}

.team-list,
.breakdown-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.team-list__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.team-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.team-list__name {
  font-size: var(--text-sm);
  color: var(--foreground);
}

.breakdown-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.breakdown-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

@media (max-width: 900px) {
  .task-list__row {
    grid-template-columns: minmax(0, 1fr);
  }

  .project-facts__item--wide {
    grid-column: span 1;
  }
}

.project-facts__value--link {
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.project-facts__value--link:hover {
  color: var(--primary);
}

.journal-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.journal-list__row {
  padding: var(--space-3) 0;
}

.journal-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.journal-list__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.journal-list__who {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.journal-list__body {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--foreground-secondary);
}

.journal-list__aside {
  margin: var(--space-1) 0 0;
}
</style>
