<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { PhCheckCircle, PhX } from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseLoading,
  BasePageHeader,
  BaseTable,
  BaseTableColumn,
} from "../../../../shared/components/base";
import TaskAssignRow from "../../../../components/projects/TaskAssignRow.vue";
import { useProjectsStore } from "../../../../shared/stores";
import type { ProjectWorkloadRow } from "../../../../shared/types";
import { t } from "../../../../i18n";
import { participantRoleLabel } from "../../../../i18n/vocabulary";

/**
 * Team and assignments.
 *
 * This page answers three questions and lets you act on all of them: how much
 * each person is carrying, what work nobody owns, and who is on which project.
 * Picking a person opens their open tasks below the table, and each of those
 * rows reassigns in place — the point of knowing somebody is overloaded is being
 * able to do something about it without leaving the page.
 *
 * Everything is read from, and written back through, the same task assignment
 * the board uses. There is no second task system here.
 */
const router = useRouter();
const projectsStore = useProjectsStore();

const workload = computed(() => projectsStore.workload);

/** Nobody carrying anything still belongs on the roster — sorted to the bottom. */
const busiest = computed(() => Math.max(1, ...workload.value.map((row) => row.open)));

const activeProjects = computed(() =>
  projectsStore.allProjects.filter((project) => project.status !== "archived"),
);

const unassignedProjects = computed(() => activeProjects.value.filter((project) => project.participants.length === 0));

const focused = computed(
  () => workload.value.find((row) => row.participant.id === projectsStore.focusParticipantId) ?? null,
);

function openProject(projectId: string) {
  void router.push({ name: "project-details", params: { projectId } });
}

/** Clicking the person you are already inspecting closes the panel again. */
function toggleFocus(participantId: string) {
  void projectsStore.focusOnParticipant(
    projectsStore.focusParticipantId === participantId ? null : participantId,
  );
}

const savedMessage = ref<string | null>(null);

async function reassign(taskId: string, projectId: string, assigneeIds: string[]) {
  savedMessage.value = null;
  await projectsStore.setTaskAssignees(taskId, assigneeIds, projectId);

  if (!projectsStore.errorMessage) {
    await projectsStore.refreshTeamViews();
    savedMessage.value = assigneeIds.length
      ? t("projects.admin.team.reassignedTo", {
          names: assigneeIds.map((id) => projectsStore.participantName(id)).join(", "),
        })
      : "Task left unassigned.";
  }
}

onMounted(async () => {
  await Promise.all([
    projectsStore.loadWorkload(),
    projectsStore.loadParticipants(),
    projectsStore.loadUnassignedTasks(),
  ]);
});
</script>

<template>
  <div class="page-stack">
    <BasePageHeader
      :title="$t('projects.admin.team.title')"
      :description="$t('projects.admin.team.description')"
    />

    <p v-if="savedMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ savedMessage }}
    </p>

    <p v-if="projectsStore.errorMessage" class="form-error-banner">{{ projectsStore.errorMessage }}</p>

    <BaseLoading v-if="projectsStore.loading && workload.length === 0" />

    <template v-else>
      <BaseCard
        :title="$t('projects.admin.team.workloadTitle')"
        :description="$t('projects.admin.team.workloadDescription')"
      >
        <BaseEmptyState
          v-if="workload.length === 0"
          :title="$t('projects.admin.team.emptyRosterTitle')"
          :description="$t('projects.admin.team.emptyRosterDescription')"
        />

        <BaseTable v-else :value="workload" data-key="participant.id">
          <BaseTableColumn :header="$t('projects.admin.team.colPerson')">
            <template #body="{ data }">
              <button
                type="button"
                class="person-cell"
                :class="{
                  'person-cell--active':
                    projectsStore.focusParticipantId === (data as ProjectWorkloadRow).participant.id,
                }"
                :aria-expanded="projectsStore.focusParticipantId === (data as ProjectWorkloadRow).participant.id"
                @click="toggleFocus((data as ProjectWorkloadRow).participant.id)"
              >
                <span class="person-cell__name">{{ (data as ProjectWorkloadRow).participant.name }}</span>
                <small>
                  {{ participantRoleLabel((data as ProjectWorkloadRow).participant.role) }}
                  <template v-if="(data as ProjectWorkloadRow).participant.isExternal">
                    · {{ $t("projects.admin.team.external") }}
                  </template>
                </small>
              </button>
            </template>
          </BaseTableColumn>

          <BaseTableColumn :header="$t('projects.admin.team.colLoad')" width="200px">
            <template #body="{ data }">
              <div class="workload-bar">
                <span class="progress-bar workload-bar__track">
                  <span
                    class="progress-bar__fill"
                    :class="{ 'progress-bar__fill--danger': (data as ProjectWorkloadRow).overdue > 0 }"
                    :style="{ width: `${((data as ProjectWorkloadRow).open / busiest) * 100}%` }"
                  />
                </span>
                <span class="type-numeric workload-bar__value">{{ (data as ProjectWorkloadRow).open }}</span>
              </div>
            </template>
          </BaseTableColumn>

          <BaseTableColumn :header="$t('projects.admin.team.colProjects')" width="90px">
            <template #body="{ data }">
              <span class="type-numeric">{{ (data as ProjectWorkloadRow).projects }}</span>
            </template>
          </BaseTableColumn>

          <BaseTableColumn :header="$t('projects.admin.team.colDone')" width="80px">
            <template #body="{ data }">
              <span class="type-numeric">{{ (data as ProjectWorkloadRow).done }}</span>
            </template>
          </BaseTableColumn>

          <BaseTableColumn :header="$t('projects.admin.team.colOverdue')" width="100px">
            <template #body="{ data }">
              <BaseBadge
                v-if="(data as ProjectWorkloadRow).overdue > 0"
                :label="String((data as ProjectWorkloadRow).overdue)"
                tone="danger"
              />
              <span v-else class="type-meta">—</span>
            </template>
          </BaseTableColumn>

          <BaseTableColumn :header="$t('projects.admin.team.colJournalHours')" width="130px">
            <template #body="{ data }">
              <span class="type-numeric">{{ (data as ProjectWorkloadRow).hours || '—' }}</span>
            </template>
          </BaseTableColumn>
        </BaseTable>
      </BaseCard>

      <!--
        The panel the workload table opens into. It exists so "who is overloaded"
        and "move some of it" are the same interaction, not two pages.
      -->
      <BaseCard
        v-if="focused"
        :title="$t('projects.admin.team.openWorkTitle', { name: focused.participant.name })"
      >
        <template #header>
          <div class="focus-head">
            <div>
              <h2 class="type-card-title focus-head__title">
                {{ $t("projects.admin.team.openWorkHeading", { name: focused.participant.name }) }}
              </h2>
              <p class="type-meta focus-head__meta">
                {{
                  $t("projects.admin.team.workloadLine", {
                    open: focused.open,
                    done: focused.done,
                    projects: focused.projects,
                  })
                }}
                <template v-if="focused.overdue > 0">
                  · {{ $t("projects.admin.team.overdueSuffix", { count: focused.overdue }) }}
                </template>
              </p>
            </div>
            <BaseButton severity="secondary" text size="small" @click="projectsStore.focusOnParticipant(null)">
              <PhX weight="bold" />
              {{ $t("common.actions.close") }}
            </BaseButton>
          </div>
        </template>

        <BaseLoading v-if="projectsStore.loadingDetails" />

        <BaseEmptyState
          v-else-if="projectsStore.focusTasks.length === 0"
          :title="$t('projects.admin.team.nothingOpenTitle')"
          :description="$t('projects.admin.team.nothingOpenDescription', { name: focused.participant.name })"
        />

        <ul v-else class="task-rows">
          <TaskAssignRow
            v-for="task in projectsStore.focusTasks"
            :key="task.id"
            :task="task"
            :participants="projectsStore.participants"
            :saving="projectsStore.saving"
            show-project
            @assign="(taskId, ids) => reassign(taskId, task.projectId, ids)"
            @open="openProject"
          />
        </ul>
      </BaseCard>

      <!--
        Unowned work, called out rather than left to be noticed. Grey body text
        was hiding exactly the tasks most likely to slip.
      -->
      <BaseCard
        :title="$t('projects.admin.team.unassignedTitle')"
        :description="$t('projects.admin.team.unassignedDescription')"
      >
        <BaseEmptyState
          v-if="projectsStore.unassignedTasks.length === 0"
          :title="$t('projects.admin.team.unassignedEmptyTitle')"
          :description="$t('projects.admin.team.unassignedEmptyDescription')"
        />

        <ul v-else class="task-rows">
          <TaskAssignRow
            v-for="task in projectsStore.unassignedTasks"
            :key="task.id"
            :task="task"
            :participants="projectsStore.participants"
            :saving="projectsStore.saving"
            show-project
            @assign="(taskId, ids) => reassign(taskId, task.projectId, ids)"
            @open="openProject"
          />
        </ul>
      </BaseCard>

      <BaseCard
        :title="$t('projects.admin.team.assignmentsTitle')"
        :description="$t('projects.admin.team.assignmentsDescription')"
      >
        <BaseEmptyState
          v-if="activeProjects.length === 0"
          :title="$t('projects.admin.team.assignmentsEmptyTitle')"
          :description="$t('projects.admin.team.assignmentsEmptyDescription')"
        />

        <ul v-else class="assignment-list">
          <li v-for="project in activeProjects" :key="project.id" class="assignment-list__row">
            <button type="button" class="assignment-list__name" @click="openProject(project.id)">
              {{ project.name }}
            </button>

            <div class="assignment-list__people">
              <BaseBadge
                v-for="participant in project.participants"
                :key="participant.id"
                :label="participant.name"
                :tone="participant.source === 'user' ? 'info' : 'neutral'"
              />
              <BaseBadge
                v-if="project.participants.length === 0"
                :label="$t('projects.task.nobodyAssigned')"
                tone="warning"
              />
            </div>
          </li>
        </ul>

        <template v-if="unassignedProjects.length > 0" #footer>
          <p class="type-meta">
            {{
              $t(
                "projects.admin.team.unassignedFooter",
                { count: unassignedProjects.length },
                unassignedProjects.length,
              )
            }}
          </p>
        </template>
      </BaseCard>
    </template>
  </div>
</template>

<style scoped>
.person-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  color: var(--foreground-secondary);
  cursor: pointer;
}

.person-cell__name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.person-cell:hover .person-cell__name,
.person-cell--active .person-cell__name {
  color: var(--primary);
}

.focus-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
}

.focus-head__title,
.focus-head__meta {
  margin: 0;
}

.task-rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.workload-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  gap: var(--space-2);
}

.workload-bar__track {
  display: block;
}

.workload-bar__value {
  text-align: right;
  color: var(--foreground-secondary);
}

.assignment-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.assignment-list__row {
  display: grid;
  grid-template-columns: minmax(160px, 240px) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.assignment-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.assignment-list__name {
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.assignment-list__name:hover {
  color: var(--primary);
}

.assignment-list__people {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

@media (max-width: 820px) {
  .assignment-list__row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
  }
}
</style>
