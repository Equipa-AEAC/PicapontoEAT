<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Chart from "primevue/chart";
import {
  PhClockCounterClockwise,
  PhDeviceMobile,
  PhFingerprint,
  PhSealCheck,
  PhStudent,
  PhTrendUp,
  PhUsersThree,
} from "@phosphor-icons/vue";
import type { ChartData, ChartOptions } from "chart.js";

import BaseCard from "../components/base/BaseCard.vue";
import BaseEmptyState from "../components/base/BaseEmptyState.vue";
import BaseLoading from "../components/base/BaseLoading.vue";
import BaseMetricCard from "../components/base/BaseMetricCard.vue";
import BasePageHeader from "../components/base/BasePageHeader.vue";
import BaseStatusPill from "../components/base/BaseStatusPill.vue";
import { useAttendanceStore } from "../stores/attendance";
import { useDashboardStore } from "../stores/dashboard";
import { useDevicesStore } from "../stores/devices";
import { useInternshipsStore } from "../stores/internships";

const router = useRouter();
const dashboardStore = useDashboardStore();
const attendanceStore = useAttendanceStore();
const devicesStore = useDevicesStore();
const internshipsStore = useInternshipsStore();

const metricIconMap = {
  "Today's attendance": PhFingerprint,
  "Current students present": PhUsersThree,
  "Weekly hours": PhTrendUp,
  "Pending corrections": PhSealCheck,
} as const;

const weeklyChart = computed<ChartData<"bar">>(() => ({
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      label: "Attendance hours",
      data: [35, 38, 42, 44, 39, 28, 30],
      backgroundColor: "rgba(110, 168, 254, 0.8)",
      borderRadius: 12,
      borderSkipped: false,
    },
  ],
}));

const weeklyOptions = computed<ChartOptions<"bar">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: "#94a3b8" } },
    y: { grid: { color: "rgba(148, 163, 184, 0.16)" }, ticks: { color: "#94a3b8" } },
  },
}));

const actionItems = [
  { label: "Members", icon: PhStudent, name: "members" },
  { label: "Attendance", icon: PhFingerprint, name: "attendance" },
  { label: "Cards", icon: PhSealCheck, name: "cards" },
  { label: "Devices", icon: PhDeviceMobile, name: "devices" },
  { label: "Reports", icon: PhTrendUp, name: "reports" },
  { label: "Corrections", icon: PhClockCounterClockwise, name: "attendance" },
];

const pendingCorrections = computed(() => attendanceStore.items.filter((item) => item.corrections > 0));
const offlineDevices = computed(() => devicesStore.items.filter((device) => device.status === "offline"));
const activeInternships = computed(() => internshipsStore.items.filter((internship) => internship.status === "active"));

const dashboardHasContent = computed(() => dashboardStore.hasData && dashboardStore.metrics.length > 0);

function goToRoute(name: string) {
  router.push({ name });
}

async function loadDashboard() {
  await Promise.all([
    dashboardStore.loadDashboard(),
    attendanceStore.loadAttendance(),
    devicesStore.loadDevices(),
    internshipsStore.loadInternships(),
  ]);
}

onMounted(async () => {
  await loadDashboard();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Operations dashboard"
      title="Attendance control center"
      description="Monitor scans, devices, internships and corrective actions from one desktop workspace."
    >
      <template #actions>
        <Button label="Refresh data" severity="secondary" outlined :loading="dashboardStore.loading || attendanceStore.loading || devicesStore.loading || internshipsStore.loading" @click="loadDashboard()" />
        <Button label="Open reports" @click="goToRoute('reports')" />
      </template>
    </BasePageHeader>

    <div class="page-breadcrumbs">
      <span>Admin Workspace</span>
      <span>/</span>
      <span>Dashboard</span>
    </div>

    <BaseLoading v-if="dashboardStore.loading || attendanceStore.loading || devicesStore.loading || internshipsStore.loading" />

    <BaseEmptyState
      v-else-if="dashboardStore.error"
      title="Dashboard unavailable"
      :description="dashboardStore.error"
      action-label="Retry"
      @action="loadDashboard()"
    />

    <BaseEmptyState
      v-else-if="!dashboardHasContent"
      title="No dashboard data"
      description="The mock dashboard did not return any metrics or activity yet."
      action-label="Reload"
      @action="loadDashboard()"
    />

    <template v-else>
      <section class="metric-grid">
        <BaseMetricCard
          v-for="metric in dashboardStore.metrics"
          :key="metric.label"
          :label="metric.label"
          :value="metric.value"
          :caption="metric.caption"
          :trend-label="metric.trendLabel"
          :trend-tone="metric.trendTone"
          :icon="metricIconMap[metric.label as keyof typeof metricIconMap]"
        />
      </section>

      <section class="dashboard-grid">
        <BaseCard title="Weekly attendance hours" description="Operational load across the current week.">
          <div class="chart-shell">
            <Chart type="bar" :data="weeklyChart" :options="weeklyOptions" />
          </div>
        </BaseCard>

        <BaseCard title="Operational signals" description="Live summary from the mock stores.">
          <div class="dashboard-signals">
            <BaseStatusPill label="Current present" tone="success" :value="String(dashboardStore.metrics[1]?.value ?? '0')" />
            <BaseStatusPill label="Pending corrections" tone="warning" :value="String(pendingCorrections.length)" />
            <BaseStatusPill label="Offline devices" tone="danger" :value="String(offlineDevices.length)" />
            <BaseStatusPill label="Active internships" tone="info" :value="String(activeInternships.length)" />
          </div>
        </BaseCard>
      </section>

      <section class="dashboard-grid">
        <BaseCard title="Recent activity" description="Latest audit-friendly events.">
          <div v-if="dashboardStore.activity.length" class="activity-list">
            <article v-for="item in dashboardStore.activity" :key="item.id" class="activity-item">
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
              </div>
              <BaseStatusPill :label="item.timestamp" :tone="item.tone" :value="item.tone" />
            </article>
          </div>
          <BaseEmptyState v-else title="No activity yet" description="The mock dashboard has no recent activity to display." />
        </BaseCard>

        <BaseCard title="Device status" description="Hardware and terminal health.">
          <div v-if="devicesStore.items.length" class="device-status-list">
            <article v-for="device in devicesStore.items" :key="device.id" class="device-status-item">
              <div>
                <h3>{{ device.name }}</h3>
                <p>{{ device.location }} • Queue {{ device.queueSize }} • {{ device.firmwareVersion }}</p>
              </div>
              <BaseStatusPill :label="device.status" :tone="device.status === 'online' ? 'success' : device.status === 'offline' ? 'danger' : 'warning'" :value="device.lastHeartbeatAt" />
            </article>
          </div>
          <BaseEmptyState v-else title="No devices loaded" description="There are no devices in the mock dataset yet." />
        </BaseCard>
      </section>

      <section class="dashboard-grid">
        <BaseCard title="Pending corrections" description="Attendance rows requiring admin review.">
          <article v-if="pendingCorrections.length === 0" class="empty-panel">
            <BaseEmptyState title="No corrections pending" description="Attendance is currently up to date." />
          </article>
          <article v-for="record in pendingCorrections" :key="record.id" class="list-row">
            <div>
              <strong>{{ record.studentName }}</strong>
              <p>{{ record.date }} • {{ record.deviceName }} • {{ record.status }}</p>
            </div>
            <Button label="Review" severity="secondary" text @click="goToRoute('attendance')" />
          </article>
        </BaseCard>

        <BaseCard title="Internship progress" description="Active placements and completed hour totals.">
          <article v-if="activeInternships.length === 0" class="empty-panel">
            <BaseEmptyState title="No active internships" description="There are no active placements in the mock dataset." />
          </article>
          <article v-for="internship in activeInternships" :key="internship.id" class="list-row">
            <div>
              <strong>{{ internship.studentName }}</strong>
              <p>{{ internship.supervisor }} • {{ internship.completedHours }}/{{ internship.requiredHours }} hours</p>
            </div>
            <BaseStatusPill :label="internship.status" tone="info" :value="internship.endDate" />
          </article>
        </BaseCard>
      </section>

      <section class="dashboard-grid">
        <BaseCard title="Quick actions" description="Direct access to common workflows.">
          <div class="quick-actions-grid">
            <Button
              v-for="action in actionItems"
              :key="action.label"
              class="quick-actions-grid__button"
              severity="secondary"
              outlined
              @click="goToRoute(action.name)"
            >
              <component :is="action.icon" weight="bold" />
              <span>{{ action.label }}</span>
            </Button>
          </div>
        </BaseCard>

        <BaseCard title="Snapshot" description="A compact operational summary.">
          <section class="snapshot-grid">
            <div class="snapshot-card">
              <span>Metrics</span>
              <strong>{{ dashboardStore.metrics.length }}</strong>
            </div>
            <div class="snapshot-card">
              <span>Activity items</span>
              <strong>{{ dashboardStore.activity.length }}</strong>
            </div>
            <div class="snapshot-card">
              <span>Offline devices</span>
              <strong>{{ offlineDevices.length }}</strong>
            </div>
            <div class="snapshot-card">
              <span>Corrections</span>
              <strong>{{ pendingCorrections.length }}</strong>
            </div>
          </section>
        </BaseCard>
      </section>
    </template>
  </section>
</template>