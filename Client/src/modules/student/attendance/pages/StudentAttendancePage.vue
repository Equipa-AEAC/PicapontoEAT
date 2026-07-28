<script setup lang="ts">
import { computed, onMounted } from "vue";

import { BaseCard, BaseEmptyState, BaseLoading, BaseStatusPill } from "../../../../shared/components/base";
import { usePortalStore } from "../../../../shared/stores";

const portalStore = usePortalStore();
const rows = computed(() => portalStore.summary?.recentAttendance ?? []);

onMounted(async () => {
  if (!portalStore.summary) {
    await portalStore.loadPortalSummary();
  }
});
</script>

<template>
  <section class="page-stack">
    <BaseLoading v-if="portalStore.loading" />

    <BaseCard v-else title="Attendance" description="Recent attendance records from the student workspace.">
      <article v-for="row in rows" :key="row.date" class="list-row">
        <div>
          <strong>{{ row.date }}</strong>
          <p>{{ row.entry }} - {{ row.exit }} ({{ row.hours }}h)</p>
        </div>
        <BaseStatusPill :label="row.status" :tone="row.status === 'Present' ? 'success' : row.status === 'Holiday' ? 'info' : 'warning'" />
      </article>
      <BaseEmptyState v-if="rows.length === 0" title="No attendance data" description="There are no recent attendance records in the mock dataset." />
    </BaseCard>
  </section>
</template>
