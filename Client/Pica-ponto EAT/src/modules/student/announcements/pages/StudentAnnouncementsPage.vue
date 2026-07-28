<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";

import { BaseCard, BaseEmptyState, BaseLoading, BasePageHeader, BaseSection, BaseSearchBar, BaseStatusPill, BaseTable, BaseToolbar } from "../../../../shared/components/base";
import { usePortalStore } from "../../../../shared/stores";

const portalStore = usePortalStore();
const searchQuery = ref("");

const announcements = computed(() => portalStore.summary?.announcements ?? []);
const filteredAnnouncements = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return announcements.value.filter((announcement) =>
    query.length === 0 || [announcement.title, announcement.description, announcement.publishedAt].join(" ").toLowerCase().includes(query),
  );
});

onMounted(async () => {
  if (!portalStore.summary) {
    await portalStore.loadPortalSummary();
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Member workspace"
      title="Announcements"
      description="Read the latest announcements from the academic and internship team."
    >
      <template #actions>
        <Button label="Refresh" severity="secondary" outlined :loading="portalStore.loading" @click="portalStore.loadPortalSummary()" />
      </template>
    </BasePageHeader>

    <div class="page-breadcrumbs">
      <span>Student Workspace</span>
      <span>/</span>
      <span>Announcements</span>
    </div>

    <BaseToolbar>
      <template #left>
        <BaseSearchBar v-model="searchQuery" placeholder="Search announcements" />
      </template>
      <template #right>
        <BaseStatusPill :label="`${filteredAnnouncements.length} items`" tone="info" />
      </template>
    </BaseToolbar>

    <BaseLoading v-if="portalStore.loading" />

    <BaseSection v-else title="Announcements" description="Mock announcements are displayed in a searchable table.">
      <BaseCard>
        <BaseTable :value="filteredAnnouncements" dataKey="id" paginator :rows="5">
          <template #empty>
            <BaseEmptyState title="No announcements" description="No announcements match the current search query." />
          </template>

          <Column field="title" header="Title" sortable />
          <Column field="description" header="Description" />
          <Column field="publishedAt" header="Published" sortable />
          <Column header="Status">
            <template #body>
              <BaseStatusPill label="Unread" tone="warning" />
            </template>
          </Column>
        </BaseTable>
      </BaseCard>
    </BaseSection>
  </section>
</template>
