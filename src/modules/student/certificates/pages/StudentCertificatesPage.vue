<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import Select from "primevue/select";

import { BaseCard, BaseEmptyState, BaseLoading, BasePageHeader, BaseSection, BaseStatusPill, BaseTable, BaseToolbar } from "../../../../shared/components/base";
import { useInternshipsStore } from "../../../../shared/stores";
import { BaseSearchBar } from "../../../../shared/components/base";

const internshipsStore = useInternshipsStore();
const searchQuery = ref("");
const statusFilter = ref<"all" | "complete" | "active" | "planned" | "paused">("all");

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Complete", value: "complete" },
  { label: "Active", value: "active" },
  { label: "Planned", value: "planned" },
  { label: "Paused", value: "paused" },
];

const rows = computed(() => internshipsStore.items.filter((item) => {
  const query = searchQuery.value.trim().toLowerCase();
  const matchesQuery = query.length === 0 || [item.studentName, item.supervisor, item.notes].join(" ").toLowerCase().includes(query);
  const matchesStatus = statusFilter.value === "all" || item.status === statusFilter.value;
  return matchesQuery && matchesStatus;
}));

const completedCount = computed(() => internshipsStore.items.filter((item) => item.status === "complete").length);
const certificateCount = computed(() => internshipsStore.items.filter((item) => Boolean(item.certificateIssuedAt)).length);

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
      eyebrow="Member workspace"
      title="Certificates"
      description="Review internship completion and preview the generated certificate output."
    >
      <template #actions>
        <Button label="Refresh" severity="secondary" outlined :loading="internshipsStore.loading" @click="internshipsStore.loadInternships()" />
      </template>
    </BasePageHeader>

    <div class="page-breadcrumbs">
      <span>Student Workspace</span>
      <span>/</span>
      <span>Certificates</span>
    </div>

    <section class="metric-grid">
      <BaseCard title="Completed" description="Internships marked complete in the mock dataset.">
        <strong>{{ completedCount }}</strong>
      </BaseCard>
      <BaseCard title="Certificates issued" description="Completed internships with certificate issuance data.">
        <strong>{{ certificateCount }}</strong>
      </BaseCard>
      <BaseCard title="Preview status" description="Latest certificate preview generated from the mock service.">
        <BaseStatusPill :label="internshipsStore.certificatePreview ? 'Ready' : 'Idle'" :tone="internshipsStore.certificatePreview ? 'success' : 'warning'" />
      </BaseCard>
    </section>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" placeholder="Search certificates by member or supervisor" />
          <Select v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" />
        </div>
      </template>
      <template #right>
        <Button label="Clear" severity="secondary" outlined @click="searchQuery = ''; statusFilter = 'all'" />
      </template>
    </BaseToolbar>

    <BaseLoading v-if="internshipsStore.loading" />

    <BaseSection v-else title="Certificate registry" description="Rows are paginated and ready for future REST endpoints.">
      <BaseCard>
        <BaseTable :value="rows" dataKey="id" paginator :rows="6">
          <template #empty>
            <BaseEmptyState title="No certificates found" description="No internship certificates match the current filters." />
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
          <Column header="Certificate">
            <template #body="slotProps">
              <span>{{ slotProps.data.certificateIssuedAt ?? 'Not issued' }}</span>
            </template>
          </Column>
          <Column header="Actions">
            <template #body="slotProps">
              <Button label="Preview" text size="small" :disabled="slotProps.data.status !== 'complete'" @click="previewCertificate(slotProps.data.studentId)" />
            </template>
          </Column>
        </BaseTable>
      </BaseCard>

      <BaseCard v-if="internshipsStore.certificatePreview" title="Certificate preview" description="Mock output returned by the certificate generator.">
        <p>{{ internshipsStore.certificatePreview.fileName }}</p>
        <p>{{ internshipsStore.certificatePreview.issuedAt }}</p>
        <p>{{ internshipsStore.certificatePreview.summary }}</p>
      </BaseCard>
    </BaseSection>
  </section>
</template>
