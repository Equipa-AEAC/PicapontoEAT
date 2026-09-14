<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { PhArchive, PhArrowCounterClockwise, PhPencilSimple, PhPlus } from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseCheckbox,
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
import ProjectFormDialog from "../../../../components/projects/ProjectFormDialog.vue";
import ProjectProgressBar from "../../../../components/projects/ProjectProgressBar.vue";
import { useProjectsStore } from "../../../../shared/stores";
import type { ProjectFormValues, ProjectPriority, ProjectStatus, ProjectSummary } from "../../../../shared/types";
import { PROJECT_PRIORITY_TONES, PROJECT_STATUS_TONES } from "../../../../shared/types";
import { t } from "../../../../i18n";
import {
  projectPriorityLabel,
  projectPriorityOptions,
  projectStatusLabel,
  projectStatusOptions,
} from "../../../../i18n/vocabulary";
import { formatIsoDate, formatRelativeTime } from "../../../../shared/utils/date";

/**
 * The project directory: every project, filterable, with archive and restore.
 *
 * A table rather than a grid of cards — the useful comparison between projects is
 * across columns (deadline, progress, owner), which a card wall cannot support.
 */
const router = useRouter();
const projectsStore = useProjectsStore();

const showForm = ref(false);
const editing = ref<ProjectSummary | null>(null);
const archiveTarget = ref<ProjectSummary | null>(null);

/* Computed, not constant: a module constant freezes the labels at import time. */
const statusOptions = computed(() => [
  { label: t("projects.filters.allStatuses"), value: "all" },
  ...projectStatusOptions(),
]);
const priorityOptions = computed(() => [
  { label: t("projects.filters.allPriorities"), value: "all" },
  ...projectPriorityOptions(),
]);

let searchTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => projectsStore.projectFilters.query,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void projectsStore.loadProjects(), 250);
  },
);

watch(
  () => [
    projectsStore.projectFilters.status,
    projectsStore.projectFilters.priority,
    projectsStore.projectFilters.participantId,
    projectsStore.projectFilters.includeArchived,
  ],
  () => void projectsStore.loadProjects(),
);

const isEmpty = computed(() => !projectsStore.loading && projectsStore.items.length === 0);

function openCreate() {
  editing.value = null;
  showForm.value = true;
}

function openEdit(project: ProjectSummary) {
  editing.value = project;
  showForm.value = true;
}

async function submit(values: ProjectFormValues) {
  const saved = await projectsStore.persistProject(values, editing.value?.id);

  if (saved) {
    showForm.value = false;
  }
}

async function confirmArchive() {
  const target = archiveTarget.value;
  archiveTarget.value = null;

  if (target) {
    await projectsStore.archive(target.id);
  }
}

function clearFilters() {
  projectsStore.resetProjectFilters();
  void projectsStore.loadProjects();
}

function statusTone(status: ProjectStatus) {
  return PROJECT_STATUS_TONES[status];
}

function priorityTone(priority: ProjectPriority) {
  return PROJECT_PRIORITY_TONES[priority];
}

onMounted(async () => {
  await Promise.all([projectsStore.loadProjects(), projectsStore.loadParticipants()]);
});
</script>

<template>
  <div class="page-stack">
    <BasePageHeader :title="$t('projects.admin.list.title')" :description="$t('projects.admin.list.description')">
      <template #actions>
        <BaseButton @click="openCreate">
          <PhPlus weight="bold" />
          {{ $t("projects.admin.list.create") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <p v-if="projectsStore.errorMessage" class="form-error-banner">{{ projectsStore.errorMessage }}</p>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar
            v-model="projectsStore.projectFilters.query"
            :placeholder="$t('projects.admin.list.search')"
          />
          <BaseSelect
            :model-value="projectsStore.projectFilters.status"
            :options="statusOptions"
            @update:model-value="projectsStore.projectFilters.status = $event as ProjectStatus | 'all'"
          />
          <BaseSelect
            :model-value="projectsStore.projectFilters.priority"
            :options="priorityOptions"
            @update:model-value="projectsStore.projectFilters.priority = $event as ProjectPriority | 'all'"
          />
          <BaseSelect
            :model-value="projectsStore.projectFilters.participantId"
            :options="projectsStore.participantOptions"
            @update:model-value="projectsStore.projectFilters.participantId = $event as string"
          />
          <BaseCheckbox
            v-model="projectsStore.projectFilters.includeArchived"
            :label="$t('projects.admin.list.includeArchived')"
          />
        </div>
      </template>

      <template #right>
        <BaseButton
          v-if="projectsStore.hasProjectFilters"
          :label="$t('common.actions.clearFilters')"
          severity="secondary"
          text
          @click="clearFilters"
        />
      </template>
    </BaseToolbar>

    <BaseLoading v-if="projectsStore.loading && projectsStore.items.length === 0" />

    <BaseCard v-else>
      <BaseEmptyState
        v-if="isEmpty"
        :title="$t('projects.admin.list.emptyTitle')"
        :description="
          projectsStore.hasProjectFilters
            ? $t('projects.admin.list.emptyFiltered')
            : $t('projects.admin.list.emptyFirst')
        "
        :action-label="
          projectsStore.hasProjectFilters
            ? $t('common.actions.clearFilters')
            : $t('projects.admin.list.create')
        "
        @action="projectsStore.hasProjectFilters ? clearFilters() : openCreate()"
      />

      <BaseTable v-else :value="projectsStore.items" data-key="id" :loading="projectsStore.loading">
        <BaseTableColumn :header="$t('projects.admin.list.colProject')" field="name" sortable>
          <template #body="{ data }">
            <button
              type="button"
              class="project-link"
              @click="router.push({ name: 'project-details', params: { projectId: (data as ProjectSummary).id } })"
            >
              <span class="project-link__name">{{ (data as ProjectSummary).name }}</span>
              <span class="project-link__meta type-meta">{{ (data as ProjectSummary).owner }}</span>
            </button>
          </template>
        </BaseTableColumn>

        <BaseTableColumn :header="$t('common.fields.status')" width="120px">
          <template #body="{ data }">
            <BaseBadge
              :label="projectStatusLabel((data as ProjectSummary).status)"
              :tone="statusTone((data as ProjectSummary).status)"
            />
          </template>
        </BaseTableColumn>

        <BaseTableColumn :header="$t('common.fields.priority')" width="110px">
          <template #body="{ data }">
            <BaseBadge
              :label="projectPriorityLabel((data as ProjectSummary).priority)"
              :tone="priorityTone((data as ProjectSummary).priority)"
            />
          </template>
        </BaseTableColumn>

        <BaseTableColumn :header="$t('projects.admin.list.colProgress')" width="170px">
          <template #body="{ data }">
            <ProjectProgressBar :progress="(data as ProjectSummary).progress" />
          </template>
        </BaseTableColumn>

        <BaseTableColumn :header="$t('common.time.deadline')" field="deadline" sortable width="140px">
          <template #body="{ data }">
            <span class="cell-stack">
              <span :class="{ 'project-overdue': (data as ProjectSummary).isOverdue }">
                {{ formatIsoDate((data as ProjectSummary).deadline) }}
              </span>
              <small v-if="(data as ProjectSummary).isOverdue">{{ $t("projects.admin.list.pastDeadline") }}</small>
            </span>
          </template>
        </BaseTableColumn>

        <BaseTableColumn :header="$t('projects.admin.list.colTeam')" width="80px">
          <template #body="{ data }">
            <span class="type-numeric">{{ (data as ProjectSummary).participants.length }}</span>
          </template>
        </BaseTableColumn>

        <BaseTableColumn :header="$t('projects.admin.list.colHours')" width="80px">
          <template #body="{ data }">
            <span class="type-numeric">{{ (data as ProjectSummary).journalHours }}</span>
          </template>
        </BaseTableColumn>

        <BaseTableColumn :header="$t('projects.admin.list.colUpdated')" width="110px">
          <template #body="{ data }">
            <span class="type-meta">{{ formatRelativeTime((data as ProjectSummary).lastActivityAt) }}</span>
          </template>
        </BaseTableColumn>

        <BaseTableColumn header="" width="90px">
          <template #body="{ data }">
            <div class="icon-actions">
              <button
                type="button"
                class="icon-actions__button"
                :aria-label="$t('projects.admin.list.editProject')"
                :title="$t('projects.admin.list.editProject')"
                @click.stop="openEdit(data as ProjectSummary)"
              >
                <PhPencilSimple weight="regular" />
              </button>

              <button
                v-if="(data as ProjectSummary).status !== 'archived'"
                type="button"
                class="icon-actions__button icon-actions__button--danger"
                :aria-label="$t('projects.admin.list.archiveProject')"
                :title="$t('projects.admin.list.archiveProject')"
                @click.stop="archiveTarget = data as ProjectSummary"
              >
                <PhArchive weight="regular" />
              </button>

              <button
                v-else
                type="button"
                class="icon-actions__button"
                :aria-label="$t('projects.admin.list.restoreProject')"
                :title="$t('projects.admin.list.restoreProject')"
                @click.stop="projectsStore.restore((data as ProjectSummary).id)"
              >
                <PhArrowCounterClockwise weight="regular" />
              </button>
            </div>
          </template>
        </BaseTableColumn>
      </BaseTable>
    </BaseCard>

    <ProjectFormDialog
      :visible="showForm"
      :project="editing"
      :participants="projectsStore.participants"
      :loading="projectsStore.saving"
      @update:visible="showForm = $event"
      @submit="submit"
    />

    <BaseConfirmDialog
      :visible="archiveTarget !== null"
      :title="$t('projects.admin.list.archiveTitle')"
      :message="$t('projects.admin.list.archiveMessage', { name: archiveTarget?.name ?? $t('nav.projects.label') })"
      :confirm-label="$t('common.actions.archive')"
      :cancel-label="$t('common.actions.cancel')"
      @update:visible="archiveTarget = null"
      @confirm="confirmArchive"
      @cancel="archiveTarget = null"
    />
  </div>
</template>

<style scoped>
.project-link {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.project-link__name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.project-link:hover .project-link__name {
  color: var(--primary);
}

.project-overdue {
  color: var(--danger);
  font-weight: var(--weight-medium);
}
</style>
