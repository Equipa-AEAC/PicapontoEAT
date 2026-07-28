<script setup lang="ts">
import { computed, onMounted } from "vue";
import Button from "primevue/button";
import Chart from "primevue/chart";
import Column from "primevue/column";
import type { ChartData, ChartOptions } from "chart.js";

import { BaseCard, BaseDataCard, BaseEmptyState, BaseLoading, BasePageHeader, BaseSection, BaseStatusPill, BaseTable } from "../../../../shared/components/base";
import { usePortalStore } from "../../../../shared/stores";

const portalStore = usePortalStore();
const attendance = computed(() => portalStore.summary?.recentAttendance ?? []);

const weeklyChart = computed<ChartData<'bar'>>(() => ({
  labels: portalStore.summary?.weeklyStatistics.map((item) => item.label) ?? [],
  datasets: [
    {
      label: 'Hours',
      data: portalStore.summary?.weeklyStatistics.map((item) => item.value) ?? [],
      backgroundColor: 'rgba(110, 168, 254, 0.82)',
      borderRadius: 12,
      borderSkipped: false,
    },
  ],
}));

const progressChart = computed<ChartData<'doughnut'>>(() => ({
  labels: ['Completed', 'Remaining'],
  datasets: [
    {
      data: [portalStore.summary?.completedHours ?? 0, portalStore.summary?.remainingHours ?? 0],
      backgroundColor: ['rgba(62, 207, 142, 0.9)', 'rgba(148, 163, 184, 0.22)'],
      borderWidth: 0,
    },
  ],
}));

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
    y: { grid: { color: 'rgba(148, 163, 184, 0.16)' }, ticks: { color: '#94a3b8' } },
  },
};

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
};

const completionProgress = computed(() => {
  const completed = portalStore.summary?.completedHours ?? 0;
  const remaining = portalStore.summary?.remainingHours ?? 0;
  const total = completed + remaining;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
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
      title="Worked Hours"
      description="Track completed and remaining hours with a mock trend chart and recent attendance records."
    >
      <template #actions>
        <Button label="Refresh" severity="secondary" outlined :loading="portalStore.loading" @click="portalStore.loadPortalSummary()" />
      </template>
    </BasePageHeader>

    <div class="page-breadcrumbs">
      <span>Student Workspace</span>
      <span>/</span>
      <span>Worked Hours</span>
    </div>

    <section class="metric-grid">
      <BaseDataCard title="Completed" :value="String(portalStore.summary?.completedHours ?? 0)" description="Hours already completed" trend-label="On track" />
      <BaseDataCard title="Remaining" :value="String(portalStore.summary?.remainingHours ?? 0)" description="Hours still required" trend-label="Target" />
      <BaseDataCard title="Progress" :value="`${completionProgress}%`" description="Completion percentage" trend-label="Placement" />
      <BaseDataCard title="Today" :value="portalStore.summary?.attendanceToday ?? '—'" description="Current attendance status" trend-label="Live" />
    </section>

    <BaseLoading v-if="portalStore.loading" />

    <template v-else>
      <section class="dashboard-grid">
        <BaseCard title="Weekly hours" description="Mock trend chart generated from the portal service.">
          <div style="height: 260px;">
            <Chart type="bar" :data="weeklyChart" :options="barOptions" />
          </div>
        </BaseCard>

        <BaseCard title="Progress split" description="Completed versus remaining hours.">
          <div style="height: 260px;">
            <Chart type="doughnut" :data="progressChart" :options="doughnutOptions" />
          </div>
        </BaseCard>
      </section>

      <BaseSection title="Recent attendance" description="Latest attendance rows used to validate the worked-hours summary.">
        <BaseCard>
          <BaseTable :value="attendance" dataKey="date" paginator :rows="5">
            <template #empty>
              <BaseEmptyState title="No attendance rows" description="There are no recent attendance rows available in the mock dataset." />
            </template>

            <Column field="date" header="Date" sortable />
            <Column field="entry" header="Entry" />
            <Column field="exit" header="Exit" />
            <Column field="hours" header="Hours" sortable />
            <Column field="status" header="Status">
              <template #body="slotProps">
                <BaseStatusPill :label="slotProps.data.status" :tone="slotProps.data.status === 'Present' ? 'success' : slotProps.data.status === 'Holiday' ? 'info' : 'warning'" />
              </template>
            </Column>
          </BaseTable>
        </BaseCard>
      </BaseSection>
    </template>
  </section>
</template>
