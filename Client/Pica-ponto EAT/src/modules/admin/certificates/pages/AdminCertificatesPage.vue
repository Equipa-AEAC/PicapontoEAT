<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import Select from "primevue/select";

import { BaseCard, BaseEmptyState, BaseLoading, BasePageHeader, BaseSection, BaseStatusPill, BaseStatsCard, BaseTable, BaseToolbar, BaseSearchBar } from "../../../../shared/components/base";
import { useInternshipsStore } from "../../../../shared/stores";
import type { InternshipSummary } from "../../../../types/internships";

const internshipsStore = useInternshipsStore();
const searchQuery = ref("");
const statusFilter = ref<"all" | InternshipSummary["status"]>("all");

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Complete", value: "complete" },
  { label: "Active", value: "active" },
  { label: "Planned", value: "planned" },
  { label: "Paused", value: "paused" },
];

const visibleCertificates = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return internshipsStore.items.filter((internship) => {
    const matchesQuery = query.length === 0 || [internship.studentName, internship.supervisor, internship.notes].join(" ").toLowerCase().includes(query);
    const matchesStatus = statusFilter.value === "all" || internship.status === statusFilter.value;
    return matchesQuery && matchesStatus;
  });
});

const completeCount = computed(() => internshipsStore.items.filter((item) => item.status === "complete").length);
const issuedCount = computed(() => internshipsStore.items.filter((item) => item.certificateIssuedAt).length);

async function previewCertificate(studentId: string) {
  await internshipsStore.previewCertificate(studentId);
}

onMounted(async () => {
  if (!internshipsStore.items.length) {
    await internshipsStore.loadInternships();
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Admin workspace"
      title="Certificates"
      description="Review internship completion and preview issued certificate output."
    >
      <template #actions>
        <Button label="Refresh" severity="secondary" outlined :loading="internshipsStore.loading" @click="internshipsStore.loadInternships()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Complete" :value="String(completeCount)" caption="Internships ready for certificates" />
      <BaseStatsCard label="Issued" :value="String(issuedCount)" caption="Certificates already issued" />
      <BaseStatsCard label="Preview state" :value="internshipsStore.certificatePreview ? 'Ready' : 'Idle'" caption="Last generated certificate preview" />
      <BaseStatsCard label="Rows" :value="String(visibleCertificates.length)" caption="Filtered certificate entries" />
    </section>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" placeholder="Search certificates" />
          <Select v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" />
        </div>
      </template>
    </BaseToolbar>

    <BaseLoading v-if="internshipsStore.loading" />

    <BaseSection v-else title="Certificate table" description="Searchable certificate rows with preview actions.">
      <BaseCard>
        <BaseTable :value="visibleCertificates" dataKey="id" paginator :rows="8">
          <template #empty>
            <BaseEmptyState title="No certificates found" description="No internship certificate rows match the current filters." />
          </template>

          <Column field="studentName" header="Member" sortable />
          <Column field="supervisor" header="Supervisor" sortable />
          <Column field="completedHours" header="Completed" sortable />
          <Column field="remainingHours" header="Remaining" sortable />
          <Column field="status" header="Status">
            <template #body="slotProps">
              <BaseStatusPill :label="slotProps.data.status" :tone="slotProps.data.status === 'complete' ? 'success' : 'warning'" />
            </template>
          </Column>
          <Column field="certificateIssuedAt" header="Issued" />
          <Column header="Actions">
            <template #body="slotProps">
              <Button label="Preview" text size="small" :disabled="slotProps.data.status !== 'complete'" @click="previewCertificate(slotProps.data.studentId)" />
            </template>
          </Column>
        </BaseTable>
      </BaseCard>

      <BaseCard v-if="internshipsStore.certificatePreview" title="Certificate preview" description="Mock output returned by the preview generator.">
        <p>{{ internshipsStore.certificatePreview.fileName }}</p>
        <p>{{ internshipsStore.certificatePreview.issuedAt }}</p>
        <p>{{ internshipsStore.certificatePreview.summary }}</p>
      </BaseCard>
    </BaseSection>
  </section>
</template>
