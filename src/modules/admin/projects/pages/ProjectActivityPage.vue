<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import {
  BaseCard,
  BaseLoading,
  BasePageHeader,
  BaseSelect,
  BaseToolbar,
} from "../../../../shared/components/base";
import ProjectActivityFeed from "../../../../components/projects/ProjectActivityFeed.vue";
import { useProjectsStore } from "../../../../shared/stores";
import type { ProjectActivityKind } from "../../../../shared/types";

/**
 * The workspace-wide activity log.
 *
 * Filtering happens on the client because the whole feed is already loaded — going
 * back to the service for a narrowing that costs one `filter` would be slower and
 * would make the two dropdowns feel laggy.
 */
const projectsStore = useProjectsStore();

const projectFilter = ref<string>("all");
const kindFilter = ref<ProjectActivityKind | "all">("all");

const kindOptions: Array<{ label: string; value: ProjectActivityKind | "all" }> = [
  { label: "Everything", value: "all" },
  { label: "Tasks created", value: "task-created" },
  { label: "Task status changes", value: "task-status-changed" },
  { label: "Task edits", value: "task-updated" },
  { label: "Assignments", value: "task-assigned" },
  { label: "Projects created", value: "project-created" },
  { label: "Project edits", value: "project-updated" },
  { label: "Archived", value: "task-archived" },
];

const projectNames = computed(() =>
  Object.fromEntries(projectsStore.allProjects.map((project) => [project.id, project.name])),
);

const filtered = computed(() =>
  projectsStore.activity.filter((event) => {
    const matchesProject = projectFilter.value === "all" || event.projectId === projectFilter.value;
    const matchesKind = kindFilter.value === "all" || event.kind === kindFilter.value;

    return matchesProject && matchesKind;
  }),
);

onMounted(async () => {
  await Promise.all([projectsStore.loadActivity(), projectsStore.loadProjects()]);
});
</script>

<template>
  <div class="page-stack">
    <BasePageHeader
      title="Project activity"
      description="Everything that has happened across the projects, newest first."
    />

    <p v-if="projectsStore.errorMessage" class="form-error-banner">{{ projectsStore.errorMessage }}</p>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSelect
            :model-value="projectFilter"
            :options="projectsStore.projectOptions"
            @update:model-value="projectFilter = $event as string"
          />
          <BaseSelect
            :model-value="kindFilter"
            :options="kindOptions"
            @update:model-value="kindFilter = $event as ProjectActivityKind | 'all'"
          />
        </div>
      </template>

      <template #right>
        <span class="type-meta">{{ filtered.length }} of {{ projectsStore.activity.length }} entries</span>
      </template>
    </BaseToolbar>

    <BaseLoading v-if="projectsStore.loading && projectsStore.activity.length === 0" />

    <BaseCard v-else>
      <ProjectActivityFeed
        :events="filtered"
        show-project
        :project-names="projectNames"
        empty-title="No matching activity"
        empty-description="Nothing matches the current filters. Widen them to see more."
      />
    </BaseCard>
  </div>
</template>
