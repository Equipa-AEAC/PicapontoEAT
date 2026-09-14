<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  PhArrowLeft,
  PhCalendarBlank,
  PhInfo,
  PhKanban,
  PhListChecks,
  PhNotePencil,
  PhPlus,
  PhPulse,
} from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseDialog,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BasePageHeader,
  BaseStatusPill,
  BaseTabs,
} from "../../../../shared/components/base";
import type { BaseTabItem } from "../../../../shared/components/base";
import ProjectActivityFeed from "../../../../components/projects/ProjectActivityFeed.vue";
import ProjectProgressBar from "../../../../components/projects/ProjectProgressBar.vue";
import TaskBoard from "../../../../components/projects/TaskBoard.vue";
import TaskDetailDialog from "../../../../components/projects/TaskDetailDialog.vue";
import TaskFormDialog from "../../../../components/projects/TaskFormDialog.vue";
import { useCalendarEventsStore, useProjectsStore } from "../../../../shared/stores";
import type { ProjectTaskSummary, TaskFormValues, TaskStatus } from "../../../../shared/types";
import { rightsSummaryKey } from "../../../../types/projectPermissions";
import { t } from "../../../../i18n";
import { projectPriorityLabel, projectStatusLabel, taskStatusLabel } from "../../../../i18n/vocabulary";
import { formatIsoDate, todayIsoDate } from "../../../../shared/utils/date";
import { useAuthStore } from "../../../../modules/authentication";

/**
 * One project, as the member working on it sees it.
 *
 * The board is the page. Everything that is *about* the project rather than
 * *work on it* — description, owner, team, deadlines — is behind a "Project
 * details" dialog, because it is read once and then never again while you are
 * actually moving cards.
 *
 * ## What the member may do here is not one question
 *
 * Every control on this page is bound to a specific right rather than to "is
 * this person on the project", because those rights genuinely differ:
 *
 * - **Move** — anybody on the project. A shared board whose cards only their
 *   owner may drag is not a shared board, and a status change is reversible and
 *   recorded with the member's name on it.
 * - **Create** — anybody on the project.
 * - **Edit and remove** — the member's own tasks (assigned to them, or raised by
 *   them). Anybody else's needs the project owner or a task coordinator, because
 *   rewriting or withdrawing work somebody is relying on is not a participant's
 *   call.
 * - **Assign to other people** — owner and task coordinators only. The picker is
 *   not rendered for anybody else; see `TaskFormDialog`.
 *
 * Access itself is checked in the service (`getMemberProjectDetail` refuses a
 * project the member is not on) rather than only by which link they were given,
 * so a hand-typed project id is answered with a refusal instead of somebody
 * else's board. All of it is a correctness guard, not authorization — see the
 * backend contract.
 */
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const projectsStore = useProjectsStore();
const eventsStore = useCalendarEventsStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");
const projectId = computed(() => String(route.params.projectId));

const activeTab = ref("board");
const detailsVisible = ref(false);
const taskFormVisible = ref(false);
const taskDetailVisible = ref(false);
const removeConfirmVisible = ref(false);
const openedTask = ref<ProjectTaskSummary | null>(null);
const editingTask = ref<ProjectTaskSummary | null>(null);
const taskDefaultStatus = ref<TaskStatus>("todo");

const project = computed(() => projectsStore.memberProject);
const board = computed(() => projectsStore.memberBoard);
const boardTasks = computed(() => board.value.flatMap((column) => column.tasks));

/** What this member may do on this project. One object, asked for by name. */
const rights = computed(() => projectsStore.openProjectRights);

/** My tasks on this project — the reason the member is here. */
const myTasks = computed(() => boardTasks.value.filter((task) => task.assigneeIds.includes(memberId.value)));

/** List view: the same tasks as the board, ordered by deadline rather than column. */
const listTasks = computed(() =>
  [...boardTasks.value].sort((first, second) => {
    if (first.dueDate && second.dueDate) return first.dueDate.localeCompare(second.dueDate);
    if (first.dueDate) return -1;
    if (second.dueDate) return 1;
    return first.title.localeCompare(second.title);
  }),
);

const today = todayIsoDate();

/** Events addressed to this project, so the board and the calendar agree. */
const upcomingEvents = computed(() =>
  eventsStore.items.filter((event) => event.projectId === projectId.value && event.date >= today).slice(0, 5),
);

const tabs = computed<BaseTabItem[]>(() => [
  { value: "board", label: t("projects.studentDetail.tabBoard"), icon: PhKanban, badge: boardTasks.value.length },
  { value: "list", label: t("projects.studentDetail.tabList"), icon: PhListChecks, badge: myTasks.value.length },
  {
    value: "activity",
    label: t("projects.studentDetail.tabActivity"),
    icon: PhPulse,
    badge: projectsStore.memberActivity.length,
  },
]);

/** The people a coordinator may hand work to, named for the details dialog. */
const coordinatorNames = computed(() => {
  const ids = project.value?.coordinatorIds ?? [];

  return ids
    .map((id) => project.value?.participants.find((participant) => participant.id === id)?.name ?? id)
    .join(", ");
});

/** Whether the member may change the task currently open in the detail dialog. */
const openedTaskEditable = computed(
  () => openedTask.value !== null && projectsStore.memberCanEdit(memberId.value, openedTask.value),
);

/* -------------------------------------------------------------- Actions */

function openCreateTask(status: TaskStatus = "todo") {
  if (!rights.value.canCreateTask) {
    return;
  }

  editingTask.value = null;
  taskDefaultStatus.value = status;
  taskDetailVisible.value = false;
  taskFormVisible.value = true;
}

function openTask(task: ProjectTaskSummary) {
  openedTask.value = task;
  taskDetailVisible.value = true;
}

function editOpenedTask(task: ProjectTaskSummary) {
  editingTask.value = task;
  taskDetailVisible.value = false;
  taskFormVisible.value = true;
}

async function submitTask(values: TaskFormValues) {
  const saved = await projectsStore.persistMemberTask(memberId.value, values, editingTask.value?.id);

  if (saved) {
    taskFormVisible.value = false;
    editingTask.value = null;
  }
}

async function moveTask(taskId: string, status: TaskStatus) {
  await projectsStore.moveMemberBoardTask(memberId.value, taskId, status);
}

/** From the detail dialog, where the card is not being dragged. */
async function changeStatus(taskId: string, status: TaskStatus) {
  await projectsStore.moveMemberBoardTask(memberId.value, taskId, status);

  // Keep the open dialog showing the task as it now is, not as it was.
  openedTask.value = boardTasks.value.find((task) => task.id === taskId) ?? null;
}

/**
 * Removing asks first, always.
 *
 * A card is one click away from the pointer at all times on a board, and a task
 * somebody else is depending on is not something to lose to a misclick. The
 * confirmation also says what actually happens — it is archived, not destroyed.
 */
function requestRemove(task: ProjectTaskSummary) {
  openedTask.value = task;
  taskDetailVisible.value = false;
  removeConfirmVisible.value = true;
}

async function confirmRemove() {
  if (openedTask.value) {
    await projectsStore.removeMemberTask(memberId.value, openedTask.value.id, projectId.value);
  }

  removeConfirmVisible.value = false;
  openedTask.value = null;
}

function openCalendar() {
  void router.push({ name: "student-calendar" });
}

function writeEntry() {
  void router.push({ name: "student-daily-log" });
}

async function load() {
  await Promise.all([
    projectsStore.loadMemberProject(memberId.value, projectId.value),
    eventsStore.loadForMember(memberId.value),
  ]);
}

watch(projectId, load);
onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="project?.name ?? $t('nav.student-project-detail.label')"
      :description="
        project
          ? $t('projects.progress.doneOfTotalTeam', { done: project.progress.done, total: project.progress.total })
          : $t('projects.studentDetail.loadingBoard')
      "
    >
      <template #actions>
        <BaseButton severity="secondary" outlined @click="router.push({ name: 'student-projects' })">
          <PhArrowLeft weight="bold" />
          {{ $t("projects.studentDetail.allProjects") }}
        </BaseButton>
        <BaseButton v-if="project" severity="secondary" outlined @click="detailsVisible = true">
          <PhInfo weight="bold" />
          {{ $t("projects.studentDetail.projectDetails") }}
        </BaseButton>
        <!-- Absent, not disabled, when creating is not this member's to do. -->
        <BaseButton v-if="project && rights.canCreateTask" @click="openCreateTask()">
          <PhPlus weight="bold" />
          {{ $t("projects.studentDetail.newTask") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState v-if="projectsStore.errorMessage" :message="projectsStore.errorMessage" @retry="load" />

    <BaseLoading v-else-if="projectsStore.loadingDetails && !project" />

    <BaseEmptyState
      v-else-if="!project"
      :title="$t('projects.studentDetail.unavailableTitle')"
      :description="$t('projects.studentDetail.unavailableDescription')"
      :action-label="$t('projects.studentDetail.allProjects')"
      @action="router.push({ name: 'student-projects' })"
    />

    <template v-else>
      <!--
        A single line of context above the board. Anything more belongs in the
        details dialog: while you are moving cards, the project's description is
        not what you are reading.
      -->
      <BaseCard class="project-bar" padding="tight">
        <div class="project-bar__row">
          <BaseStatusPill
            :label="projectStatusLabel(project.status)"
            :tone="project.status === 'active' ? 'success' : project.status === 'paused' ? 'warning' : 'info'"
          />
          <span class="type-meta">
            {{
              project.deadline
                ? $t("projects.studentDetail.dueOn", { date: formatIsoDate(project.deadline) })
                : $t("projects.studentDetail.noDeadlineSet")
            }}
            <template v-if="project.isOverdue">
              · <strong class="project-bar__late">{{ $t("projects.studentDetail.overdue") }}</strong>
            </template>
          </span>
          <span class="type-meta">{{ $t("projects.studentDetail.assignedToYou", { count: myTasks.length }) }}</span>
          <div class="project-bar__progress">
            <ProjectProgressBar :progress="project.progress" compact />
          </div>
        </div>
      </BaseCard>

      <BaseTabs v-model="activeTab" :tabs="tabs">
        <!-- ---------------------------------------------------------- Board -->
        <template #board>
          <BaseCard>
            <TaskBoard
              :columns="board"
              :can-add="rights.canCreateTask"
              :can-move="rights.canMoveTasks"
              @move="moveTask"
              @open="openTask"
              @add="openCreateTask"
            />

            <template #footer>
              <p class="type-meta">
                {{ rights.canMoveTasks ? $t("projects.board.hint") : $t("projects.board.readOnlyHint") }}
              </p>
            </template>
          </BaseCard>
        </template>

        <!-- ----------------------------------------------------------- List -->
        <template #list>
          <BaseCard
            :title="$t('projects.studentDetail.listTitle')"
            :description="$t('projects.studentDetail.listDescription')"
          >
            <BaseEmptyState
              v-if="listTasks.length === 0"
              :title="$t('projects.studentDetail.listEmptyTitle')"
              :description="$t('projects.studentDetail.listEmptyDescription')"
              :action-label="rights.canCreateTask ? $t('projects.studentDetail.newTask') : undefined"
              @action="openCreateTask()"
            />

            <ul v-else class="task-list">
              <li v-for="task in listTasks" :key="task.id" class="task-list__row">
                <button type="button" class="task-list__main" @click="openTask(task)">
                  <span class="task-list__title">
                    {{ task.title }}
                    <BaseBadge
                      v-if="task.assigneeIds.includes(memberId)"
                      :label="$t('projects.task.yours')"
                      tone="info"
                    />
                  </span>
                  <span class="type-meta">
                    {{
                      task.assignees.map((assignee) => assignee.name).join(", ") || $t("projects.task.nobodyAssigned")
                    }}
                    · {{ projectPriorityLabel(task.priority) }}
                  </span>
                </button>

                <span class="task-list__due type-meta" :class="{ 'task-list__due--overdue': task.isOverdue }">
                  {{ task.dueDate ? formatIsoDate(task.dueDate) : $t("common.time.noDeadline") }}
                  <template v-if="task.dueLabel"> · {{ task.dueLabel }}</template>
                </span>

                <BaseBadge :label="taskStatusLabel(task.status)" tone="neutral" />
              </li>
            </ul>
          </BaseCard>
        </template>

        <!-- ------------------------------------------------------- Activity -->
        <template #activity>
          <BaseCard
            :title="$t('projects.studentDetail.activityTitle')"
            :description="$t('projects.studentDetail.activityDescription')"
          >
            <ProjectActivityFeed :events="projectsStore.memberActivity" />
          </BaseCard>
        </template>
      </BaseTabs>

      <!--
        Project events, kept beside the board rather than only on the calendar:
        a session booked for this project is part of working on it.
      -->
      <BaseCard
        v-if="upcomingEvents.length > 0"
        :title="$t('projects.studentDetail.eventsTitle')"
        :description="$t('projects.studentDetail.eventsDescription')"
      >
        <ul class="event-list">
          <li v-for="event in upcomingEvents" :key="event.id" class="event-list__row">
            <span class="event-list__date type-numeric">{{ formatIsoDate(event.date) }}</span>
            <div class="event-list__main">
              <span class="event-list__title">{{ event.title }}</span>
              <span class="type-meta">
                <template v-if="event.startTime">{{ event.startTime }} · </template>{{ event.authorName }}
              </span>
            </div>
          </li>
        </ul>

        <template #footer>
          <BaseButton severity="secondary" text @click="openCalendar">
            <PhCalendarBlank weight="bold" />
            {{ $t("projects.studentDetail.seeOnCalendar") }}
          </BaseButton>
        </template>
      </BaseCard>
    </template>

    <!-- ------------------------------------------------------------ Dialogs -->
    <BaseDialog
      :visible="detailsVisible"
      :header="project?.name ?? $t('nav.student-project-detail.label')"
      @update:visible="detailsVisible = $event"
    >
      <template v-if="project">
        <p class="details__description">
          {{ project.description || $t("projects.studentDetail.noProjectDescription") }}
        </p>

        <dl class="details__facts">
          <div class="details__row">
            <dt class="type-label">{{ $t("common.fields.status") }}</dt>
            <dd>{{ projectStatusLabel(project.status) }}</dd>
          </div>
          <div class="details__row">
            <dt class="type-label">{{ $t("common.fields.priority") }}</dt>
            <dd>{{ projectPriorityLabel(project.priority) }}</dd>
          </div>
          <div class="details__row">
            <dt class="type-label">{{ $t("projects.studentDetail.owner") }}</dt>
            <dd>{{ project.owner || $t("common.state.notAssigned") }}</dd>
          </div>
          <div class="details__row">
            <dt class="type-label">{{ $t("projects.studentDetail.starts") }}</dt>
            <dd>{{ project.startDate ? formatIsoDate(project.startDate) : $t("common.state.notSet") }}</dd>
          </div>
          <div class="details__row">
            <dt class="type-label">{{ $t("common.time.deadline") }}</dt>
            <dd>
              {{ project.deadline ? formatIsoDate(project.deadline) : $t("projects.studentDetail.noDeadlineSet") }}
              <span v-if="project.isOverdue" class="project-bar__late">
                · {{ $t("projects.studentDetail.overdue") }}
              </span>
            </dd>
          </div>
          <div class="details__row">
            <dt class="type-label">{{ $t("projects.studentDetail.team") }}</dt>
            <dd>
              {{
                project.participants.map((participant) => participant.name).join(", ") ||
                $t("projects.task.nobodyAssigned")
              }}
            </dd>
          </div>
          <!--
            Named openly. Who may hand out work is exactly the kind of rule that
            breeds resentment when it is invisible and somebody's change is
            silently refused.
          -->
          <div class="details__row">
            <dt class="type-label">{{ $t("projects.studentDetail.taskCoordinators") }}</dt>
            <dd>{{ coordinatorNames || $t("projects.studentDetail.taskCoordinatorsNone") }}</dd>
          </div>
          <div class="details__row">
            <dt class="type-label">{{ $t("projects.studentDetail.yourWork") }}</dt>
            <dd>
              {{
                $t("projects.studentDetail.yourWorkValue", {
                  done: myTasks.filter((task) => task.status === "done").length,
                  total: myTasks.length,
                })
              }}
            </dd>
          </div>
          <div class="details__row">
            <dt class="type-label">{{ $t("projects.studentDetail.yourRights") }}</dt>
            <dd>{{ $t(rightsSummaryKey(rights)) }}</dd>
          </div>
        </dl>

        <p class="type-meta details__note">{{ $t("projects.studentDetail.maintainedNote") }}</p>
      </template>

      <template #footer>
        <div class="details__footer">
          <BaseButton :label="$t('common.actions.close')" severity="secondary" text @click="detailsVisible = false" />
          <BaseButton severity="secondary" outlined @click="writeEntry">
            <PhNotePencil weight="bold" />
            {{ $t("projects.studentDetail.logTime") }}
          </BaseButton>
        </div>
      </template>
    </BaseDialog>

    <TaskDetailDialog
      :visible="taskDetailVisible"
      :task="openedTask"
      :can-move="rights.canMoveTasks"
      :can-edit="openedTaskEditable"
      :can-remove="openedTaskEditable"
      :busy="projectsStore.saving"
      @update:visible="taskDetailVisible = $event"
      @edit="editOpenedTask"
      @remove="requestRemove"
      @change-status="changeStatus"
    />

    <TaskFormDialog
      :visible="taskFormVisible"
      :task="editingTask"
      :projects="project ? [project] : []"
      :participants="projectsStore.memberParticipants"
      :loading="projectsStore.saving"
      :locked-project-id="projectId"
      :default-status="taskDefaultStatus"
      :can-assign-others="rights.canAssignOthers"
      :self-id="memberId"
      @update:visible="taskFormVisible = $event"
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
.project-bar__row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.project-bar__progress {
  min-width: 160px;
  margin-left: auto;
}

.project-bar__late {
  color: var(--danger);
}

.task-list,
.event-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.task-list__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, auto) auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.task-list__row:not(:last-child),
.event-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
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
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.task-list__main:hover .task-list__title {
  color: var(--primary);
}

.task-list__due {
  white-space: nowrap;
}

.task-list__due--overdue {
  color: var(--danger);
  font-weight: var(--weight-medium);
}

.event-list__row {
  display: grid;
  grid-template-columns: minmax(96px, auto) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.event-list__date {
  font-size: var(--text-xs);
  color: var(--foreground-secondary);
  white-space: nowrap;
}

.event-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.event-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.details__description {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--foreground-secondary);
}

.details__facts {
  margin: 0;
  display: flex;
  flex-direction: column;
}

.details__row {
  display: grid;
  grid-template-columns: minmax(90px, 140px) minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.details__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.details__row dd {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--foreground);
}

.details__note {
  margin: var(--space-4) 0 0;
}

.details__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

@media (max-width: 820px) {
  .task-list__row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: var(--space-2);
  }

  .project-bar__progress {
    margin-left: 0;
    width: 100%;
  }
}
</style>
