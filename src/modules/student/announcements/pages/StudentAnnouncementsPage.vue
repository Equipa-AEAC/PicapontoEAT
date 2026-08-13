<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { BaseButton, BaseCard, BaseEmptyState, BaseLoading, BasePageHeader, BaseSection, BaseSearchBar, BaseStatusPill, BaseTable, BaseTableColumn, BaseToolbar } from "../../../../shared/components/base";
import { CURRENT_MEMBER_ID } from "../../../../shared/constants";
import { useAnnouncementsStore, useInternshipsStore } from "../../../../shared/stores";
import { ANNOUNCEMENT_AUDIENCE_LABELS, ANNOUNCEMENT_PRIORITY_LABELS } from "../../../../types/announcements";
import type { AnnouncementPriority, AnnouncementSummary } from "../../../../types/announcements";
import { PLACEMENT_PROGRAM_LABELS } from "../../../../types/placements";
import type { PlacementProgram } from "../../../../types/placements";

const announcementsStore = useAnnouncementsStore();
const internshipsStore = useInternshipsStore();
const searchQuery = ref("");

const priorityTones: Record<AnnouncementPriority, "info" | "warning" | "danger"> = {
  normal: "info",
  important: "warning",
  urgent: "danger",
};

/**
 * Every member is a volunteer on the surplus-hours track; holding an internship record
 * additionally puts them on the official FCT track for announcement targeting.
 */
const memberProgram = computed<PlacementProgram>(() =>
  internshipsStore.selectedInternship ? "official-internship" : "equipa-hours",
);

const filteredAnnouncements = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return announcementsStore.visibleForMember.filter((announcement) =>
    query.length === 0 || [announcement.title, announcement.body].join(" ").toLowerCase().includes(query),
  );
});

function audienceLabel(announcement: AnnouncementSummary) {
  return ANNOUNCEMENT_AUDIENCE_LABELS[announcement.audience];
}

function priorityLabel(announcement: AnnouncementSummary) {
  return ANNOUNCEMENT_PRIORITY_LABELS[announcement.priority];
}

async function refresh() {
  await announcementsStore.loadAnnouncementsForProgram(memberProgram.value);
}

onMounted(async () => {
  await internshipsStore.loadInternship(CURRENT_MEMBER_ID);
  await refresh();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Announcements"
      description="Announcements addressed to everyone plus the ones targeted at your participation track."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="announcementsStore.loading" @click="refresh()" />
      </template>
    </BasePageHeader>

    <BaseToolbar>
      <template #left>
        <BaseSearchBar v-model="searchQuery" placeholder="Search announcements" />
      </template>
      <template #right>
        <BaseStatusPill :label="PLACEMENT_PROGRAM_LABELS[memberProgram]" tone="success" />
        <BaseStatusPill :label="`${filteredAnnouncements.length} items`" tone="info" />
      </template>
    </BaseToolbar>

    <BaseLoading v-if="announcementsStore.loading" />

    <BaseSection v-else title="Announcements" description="Only published announcements for your audience are listed.">
      <BaseCard>
        <BaseTable :value="filteredAnnouncements" dataKey="id" paginator :rows="5">
          <template #empty>
            <BaseEmptyState title="No announcements" description="No announcements match the current search query." />
          </template>

          <BaseTableColumn field="title" header="Title" sortable />
          <BaseTableColumn field="body" header="Message" />
          <BaseTableColumn header="Audience">
            <template #body="slotProps">{{ audienceLabel(slotProps.data) }}</template>
          </BaseTableColumn>
          <BaseTableColumn header="Priority">
            <template #body="slotProps">
              <BaseStatusPill :label="priorityLabel(slotProps.data)" :tone="priorityTones[slotProps.data.priority as AnnouncementPriority]" />
            </template>
          </BaseTableColumn>
          <BaseTableColumn field="publishedAt" header="Published" sortable />
        </BaseTable>
      </BaseCard>
    </BaseSection>
  </section>
</template>
