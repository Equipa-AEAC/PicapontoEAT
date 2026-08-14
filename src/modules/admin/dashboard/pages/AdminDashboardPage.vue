<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  PhBriefcase,
  PhCertificate,
  PhClockCounterClockwise,
  PhCreditCard,
  PhDeviceMobile,
  PhFingerprint,
  PhMegaphone,
  PhStudent,
  PhTrendUp,
} from "@phosphor-icons/vue";
import type { ChartData, ChartOptions } from "chart.js";

import BaseButton from "../../../../components/base/BaseButton.vue";
import BaseCard from "../../../../components/base/BaseCard.vue";
import BaseChart from "../../../../components/base/BaseChart.vue";
import BaseEmptyState from "../../../../components/base/BaseEmptyState.vue";
import BaseLoading from "../../../../components/base/BaseLoading.vue";
import BaseMetricCard from "../../../../components/base/BaseMetricCard.vue";
import BasePageHeader from "../../../../components/base/BasePageHeader.vue";
import BaseStatusPill from "../../../../components/base/BaseStatusPill.vue";
import { useAttendanceStore } from "../../../../stores/attendance";
import { useDashboardStore } from "../../../../stores/dashboard";
import { useDevicesStore } from "../../../../stores/devices";
import { useInternshipsStore } from "../../../../stores/internships";
import { useMembersStore } from "../../../../stores/members";
import type { StatusTone } from "../../../../types/dashboard";

const router = useRouter();
const dashboardStore = useDashboardStore();
const attendanceStore = useAttendanceStore();
const devicesStore = useDevicesStore();
const internshipsStore = useInternshipsStore();
const membersStore = useMembersStore();

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
  { label: "Cards", icon: PhCreditCard, name: "cards" },
  { label: "Internships", icon: PhBriefcase, name: "internships" },
  { label: "Devices", icon: PhDeviceMobile, name: "devices" },
  { label: "Certificates", icon: PhCertificate, name: "certificates" },
  { label: "Announcements", icon: PhMegaphone, name: "announcements" },
  { label: "Reports", icon: PhTrendUp, name: "reports" },
  { label: "Corrections", icon: PhClockCounterClockwise, name: "attendance" },
];

const pendingCorrections = computed(() => attendanceStore.items.filter((item) => item.corrections > 0));
const offlineDevices = computed(() => devicesStore.items.filter((device) => device.status === "offline"));
const activeInternships = computed(() => internshipsStore.items.filter((internship) => internship.status === "active"));
const presentNow = computed(() => attendanceStore.items.filter((item) => item.status === "present").length);
const unassignedCards = computed(() => membersStore.allMembers.filter((member) => !member.assignedCardUid).length);
const weeklyHours = computed(() => attendanceStore.items.reduce((total, item) => total + (item.hours ?? 0), 0));

const attendanceRate = computed(() => {
  const total = attendanceStore.items.length;
  return total === 0 ? 0 : Math.round((presentNow.value / total) * 100);
});

/**
 * An internship is "at risk" when the share of its hours already completed lags
 * the share of its calendar that has elapsed by more than 15 points.
 */
const internshipsAtRisk = computed(() =>
  internshipsStore.items.filter((internship) => {
    if (internship.status !== "active" || internship.requiredHours <= 0) {
      return false;
    }

    const start = Date.parse(internship.startDate);
    const end = Date.parse(internship.endDate);

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return false;
    }

    const elapsed = Math.min(Math.max((Date.now() - start) / (end - start), 0), 1);
    const completed = internship.completedHours / internship.requiredHours;
    return elapsed - completed > 0.15;
  }).length,
);

interface SnapshotRow {
  label: string;
  value: string;
  tone: StatusTone;
  route: string;
}

/** Tones come from thresholds, so a green row genuinely means "nothing to do here". */
const snapshotRows = computed<SnapshotRow[]>(() => [
  { label: "Present now", value: String(presentNow.value), tone: presentNow.value > 0 ? "success" : "warning", route: "attendance" },
  {
    label: "Attendance rate",
    value: `${attendanceRate.value}%`,
    tone: attendanceRate.value >= 80 ? "success" : attendanceRate.value >= 60 ? "warning" : "danger",
    route: "attendance",
  },
  { label: "Hours this week", value: `${Math.round(weeklyHours.value)}h`, tone: "info", route: "reports" },
  {
    label: "Pending corrections",
    value: String(pendingCorrections.value.length),
    tone: pendingCorrections.value.length === 0 ? "success" : pendingCorrections.value.length > 3 ? "danger" : "warning",
    route: "attendance",
  },
  {
    label: "Offline devices",
    value: String(offlineDevices.value.length),
    tone: offlineDevices.value.length === 0 ? "success" : "danger",
    route: "devices",
  },
  { label: "Active internships", value: String(activeInternships.value.length), tone: "info", route: "internships" },
  {
    label: "Internships at risk",
    value: String(internshipsAtRisk.value),
    tone: internshipsAtRisk.value === 0 ? "success" : "warning",
    route: "internships",
  },
  {
    label: "Members without a card",
    value: String(unassignedCards.value),
    tone: unassignedCards.value === 0 ? "success" : "warning",
    route: "cards",
  },
]);

const busy = computed(
  () => dashboardStore.loading || attendanceStore.loading || devicesStore.loading || internshipsStore.loading || membersStore.loading,
);

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
    membersStore.loadAllMembers(),
  ]);
}

onMounted(async () => {
  await loadDashboard();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader title="Dashboard">
      <template #actions>
        <BaseButton label="Refresh data" severity="secondary" outlined :loading="busy" @click="loadDashboard()" />
        <BaseButton label="Open reports" @click="goToRoute('reports')" />
      </template>
    </BasePageHeader>

    <BaseLoading v-if="busy" />

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
          :icon="metric.icon"
        />
      </section>

      <section class="dashboard-grid">
        <BaseCard title="Weekly attendance hours" description="Operational load across the current week.">
          <div class="chart-shell">
            <BaseChart type="bar" :data="weeklyChart" :options="weeklyOptions" />
          </div>
        </BaseCard>

        <BaseCard title="Snapshot" description="Where the operation stands right now. Click a row to act on it.">
          <div class="snapshot-list">
            <button
              v-for="row in snapshotRows"
              :key="row.label"
              type="button"
              class="snapshot-list__row"
              @click="goToRoute(row.route)"
            >
              <span class="snapshot-list__label">{{ row.label }}</span>
              <BaseStatusPill :label="row.value" :tone="row.tone" />
            </button>
          </div>
        </BaseCard>
      </section>

      <nav class="quick-actions-rail" aria-label="Quick actions">
        <button
          v-for="action in actionItems"
          :key="action.label"
          type="button"
          class="quick-actions-rail__item"
          @click="goToRoute(action.name)"
        >
          <component :is="action.icon" weight="bold" />
          <span>{{ action.label }}</span>
        </button>
      </nav>

      <section class="dashboard-grid">
        <BaseCard title="Recent activity" description="Latest audit-friendly events.">
          <div v-if="dashboardStore.activity.length" class="activity-list">
            <article v-for="item in dashboardStore.activity" :key="item.id" class="activity-item">
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
              </div>
              <BaseStatusPill :label="item.timestamp" :tone="item.tone" />
            </article>
          </div>
          <BaseEmptyState v-else title="No activity yet" description="The mock dashboard has no recent activity to display." />
        </BaseCard>

        <BaseCard title="Device status" description="Hardware and terminal health.">
          <div v-if="devicesStore.items.length" class="device-status-list">
            <article v-for="device in devicesStore.items" :key="device.id" class="device-status-item">
              <div>
                <h3>{{ device.name }}</h3>
                <p>{{ device.location }} • Queue {{ device.queueSize }} • last seen {{ device.lastHeartbeatAt }}</p>
              </div>
              <BaseStatusPill :label="device.status" :tone="device.status === 'online' ? 'success' : device.status === 'offline' ? 'danger' : 'warning'" />
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
            <BaseButton label="Review" severity="secondary" text @click="goToRoute('attendance')" />
          </article>
        </BaseCard>

        <BaseCard title="Internship progress" description="Active placements and completed hour totals.">
          <article v-if="activeInternships.length === 0" class="empty-panel">
            <BaseEmptyState title="No active internships" description="There are no active placements in the mock dataset." />
          </article>
          <article v-for="internship in activeInternships" :key="internship.id" class="list-row">
            <div>
              <strong>{{ internship.studentName }}</strong>
              <p>{{ internship.orientador }} • {{ internship.completedHours }}/{{ internship.requiredHours }} hours • ends {{ internship.endDate }}</p>
            </div>
            <BaseStatusPill :label="internship.status" tone="info" />
          </article>
        </BaseCard>
      </section>
    </template>
  </section>
</template>
