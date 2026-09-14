<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";

import { t } from "../../../../i18n";
import {
  PhBriefcase,
  PhCalendarBlank,
  PhCertificate,
  PhCreditCard,
  PhDeviceMobile,
  PhFingerprint,
  PhMegaphone,
  PhStudent,
  PhTrendUp,
} from "@phosphor-icons/vue";
import type { ChartData, ChartOptions } from "chart.js";

import {
  BaseButton,
  BaseCard,
  BaseChart,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BaseMetricCard,
  BasePageHeader,
  BaseStatusPill,
} from "../../../../shared/components/base";
import {
  useAttendanceCorrectionsStore,
  useAttendanceStore,
  useDashboardStore,
  useDevicesStore,
  useInternshipReportsStore,
  useInternshipsStore,
  useMembersStore,
} from "../../../../shared/stores";
import type { StatusTone } from "../../../../types/dashboard";
import { useChartTheme } from "../../../../composables/useChartTheme";
import { hoursByCalendarWeek } from "../../../../shared/utils/attendanceStats";
import { formatIsoDate, formatRelativeTime, formatTimestamp } from "../../../../shared/utils/date";
import { auditActionLabel, auditEntityLabel, deviceStatusLabel, formatActivity } from "../../../../i18n/vocabulary";
import type { DashboardActivity } from "../../../../types/dashboard";

/**
 * The activity strip's title params, resolved fresh on every render.
 *
 * An audit row's `titleParams` carries the raw `entity`/`action` values, not
 * `auditEntityLabel`/`auditActionLabel` already applied — those read the active
 * locale, so resolving them here (inside a computed the template calls on every
 * render) is what lets the row's wording follow a language switch instead of
 * staying frozen in whichever language was active when the dashboard loaded.
 */
function activityTitleParams(item: DashboardActivity): Record<string, unknown> {
  if (item.titleKey === "admin.metrics.auditRow" && item.titleParams) {
    const { entity, action } = item.titleParams as { entity: string; action: string };
    return { entity: auditEntityLabel(entity), action: auditActionLabel(action).toLocaleLowerCase() };
  }

  return item.titleParams ?? {};
}

/** The activity strip's second line, same reasoning as `activityTitleParams`. */
function activityDescription(item: DashboardActivity): string {
  if (item.messageKey !== undefined) {
    return t("admin.metrics.byActor", {
      summary: formatActivity({
        summary: item.messageSummary ?? "",
        messageKey: item.messageKey,
        messageParams: item.messageParams,
      }),
      actor: item.actorName,
    });
  }

  if (item.descriptionKey) {
    return t(item.descriptionKey, item.descriptionParams ?? {});
  }

  return item.description ?? "";
}

/**
 * The operations dashboard.
 *
 * Three things were wrong beyond the layout.
 *
 * **The weekly chart was invented.** `data: [35, 38, 42, 44, 39, 28, 30]` was
 * hardcoded in the component and labelled Mon–Sun, so the panel drew the same
 * seven bars whatever the system contained — and it was a day-of-week
 * aggregation besides, which stacks every Monday in the record into one column
 * and produces totals no day ever held. It is replaced by hours per calendar
 * week from the attendance collection: each bar is a real, consecutive week,
 * labelled by the Monday it starts on, which is what "workload across the
 * period" actually means.
 *
 * **"Pending corrections" counted the wrong thing.** It listed attendance rows
 * whose `corrections` count was above zero — records that had *already been
 * corrected*, i.e. work that is finished. The queue somebody has to work through
 * is the correction *requests* still unanswered, which is what it now reads, and
 * it spans the page because it is the one list on here that is a to-do.
 *
 * **The layout left dead space.** Device status sat beside Recent activity in a
 * two-column grid with nothing under it, while Internship progress had a row of
 * its own further down. They are now stacked in the same column, which closes
 * the gap and puts the two "state of the estate" panels together.
 */
const router = useRouter();
const dashboardStore = useDashboardStore();
const attendanceStore = useAttendanceStore();
const correctionsStore = useAttendanceCorrectionsStore();
const devicesStore = useDevicesStore();
const internshipsStore = useInternshipsStore();
const membersStore = useMembersStore();
const reportsStore = useInternshipReportsStore();
const { palette, baseOptions } = useChartTheme();

/**
 * Hours per calendar week, oldest first.
 *
 * Derived from the attendance collection, so an empty system draws an empty
 * chart rather than a plausible-looking one.
 */
const weeklyHours = computed(() => hoursByCalendarWeek(attendanceStore.items, 8));

const weeklyChart = computed<ChartData<"bar">>(() => ({
  labels: weeklyHours.value.map((point) => point.label),
  datasets: [
    {
      label: t("admin.dashboard.seriesAttendanceHours"),
      data: weeklyHours.value.map((point) => point.value),
      backgroundColor: palette.value.series[0],
      borderRadius: 2,
      borderSkipped: false,
      maxBarThickness: 40,
    },
  ],
}));

const weeklyOptions = computed<ChartOptions<"bar">>(() => baseOptions.value as ChartOptions<"bar">);

/*
 * The quick-action rail names its destinations through the navigation keys, not
 * through its own copy — the sidebar and this rail point at the same nine pages,
 * and two lists of names is one more than can stay in step.
 */
const actionItems = computed(() =>
  [
    { icon: PhStudent, name: "members" },
    { icon: PhFingerprint, name: "attendance" },
    { icon: PhCalendarBlank, name: "calendar" },
    { icon: PhCreditCard, name: "cards" },
    { icon: PhBriefcase, name: "internships" },
    { icon: PhDeviceMobile, name: "devices" },
    { icon: PhCertificate, name: "certificates" },
    { icon: PhMegaphone, name: "announcements" },
    { icon: PhTrendUp, name: "reports" },
  ].map((item) => ({ ...item, label: t(`nav.${item.name}.label`) })),
);

/** Requests nobody has answered — the actual queue, not records already corrected. */
const openCorrections = computed(() => correctionsStore.openRequests);
const offlineDevices = computed(() => devicesStore.items.filter((device) => device.status === "offline"));
const activeInternships = computed(() => internshipsStore.items.filter((internship) => internship.status === "active"));
const presentNow = computed(() => attendanceStore.items.filter((item) => item.status === "present").length);
const unassignedCards = computed(() => membersStore.allMembers.filter((member) => !member.assignedCardUid).length);
const totalHours = computed(() => attendanceStore.items.reduce((total, item) => total + (item.hours ?? 0), 0));

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

/** How far through its calendar an active placement is, for the progress rail. */
function elapsedPercent(startDate: string, endDate: string): number | null {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }

  return Math.round(Math.min(Math.max((Date.now() - start) / (end - start), 0), 1) * 100);
}

function hourPercent(internship: { completedHours: number; requiredHours: number }): number {
  return internship.requiredHours > 0
    ? Math.round((internship.completedHours / internship.requiredHours) * 100)
    : 0;
}

interface SnapshotRow {
  label: string;
  value: string;
  tone: StatusTone;
  route: string;
}

/** Tones come from thresholds, so a green row genuinely means "nothing to do here". */
const snapshotRows = computed<SnapshotRow[]>(() => [
  { label: t("admin.dashboard.presentNow"), value: String(presentNow.value), tone: presentNow.value > 0 ? "success" : "warning", route: "attendance" },
  {
    label: t("admin.dashboard.attendanceRate"),
    value: `${attendanceRate.value}%`,
    tone: attendanceRate.value >= 80 ? "success" : attendanceRate.value >= 60 ? "warning" : "danger",
    route: "attendance",
  },
  { label: t("admin.dashboard.hoursRecorded"), value: `${Math.round(totalHours.value)}h`, tone: "info", route: "reports" },
  {
    label: t("admin.dashboard.correctionsWaiting"),
    value: String(openCorrections.value.length),
    tone: openCorrections.value.length === 0 ? "success" : openCorrections.value.length > 3 ? "danger" : "warning",
    route: "attendance",
  },
  {
    label: t("admin.dashboard.reportsToReview"),
    value: String(reportsStore.awaitingReviewCount),
    tone: reportsStore.awaitingReviewCount === 0 ? "success" : "warning",
    route: "reports",
  },
  {
    label: t("admin.dashboard.offlineDevices"),
    value: String(offlineDevices.value.length),
    tone: offlineDevices.value.length === 0 ? "success" : "danger",
    route: "devices",
  },
  { label: t("admin.dashboard.activeInternships"), value: String(activeInternships.value.length), tone: "info", route: "internships" },
  {
    label: t("admin.dashboard.internshipsAtRisk"),
    value: String(internshipsAtRisk.value),
    tone: internshipsAtRisk.value === 0 ? "success" : "warning",
    route: "internships",
  },
  {
    label: t("admin.dashboard.membersWithoutCard"),
    value: String(unassignedCards.value),
    tone: unassignedCards.value === 0 ? "success" : "warning",
    route: "cards",
  },
]);

const busy = computed(
  () =>
    dashboardStore.loading ||
    attendanceStore.loading ||
    devicesStore.loading ||
    internshipsStore.loading ||
    membersStore.loading,
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
    correctionsStore.loadQueue(),
    reportsStore.refreshAwaitingReviewCount(),
  ]);
}

onMounted(async () => {
  await loadDashboard();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader :title="$t('admin.dashboard.title')">
      <template #actions>
        <BaseButton :label="$t('admin.dashboard.refresh')" severity="secondary" outlined :loading="busy" @click="loadDashboard()" />
        <BaseButton :label="$t('admin.dashboard.openReports')" @click="goToRoute('reports')" />
      </template>
    </BasePageHeader>

    <BaseLoading v-if="busy" />

    <!-- "Could not load" and "nothing to show" are different facts. -->
    <BaseErrorState
      v-else-if="dashboardStore.errorMessage"
      :title="$t('admin.dashboard.unavailable')"
      :message="dashboardStore.errorMessage"
      @retry="loadDashboard()"
    />

    <BaseEmptyState
      v-else-if="!dashboardHasContent"
      :title="$t('admin.dashboard.emptyTitle')"
      :description="$t('admin.dashboard.emptyDescription')"
      :action-label="$t('admin.dashboard.reload')"
      @action="loadDashboard()"
    />

    <template v-else>
      <section class="metric-grid">
        <BaseMetricCard
          v-for="metric in dashboardStore.metrics"
          :key="metric.labelKey"
          :label="$t(metric.labelKey)"
          :value="metric.value"
          :caption="$t(metric.captionKey)"
          :trend-label="metric.trendKey ? $t(metric.trendKey, metric.trendParams ?? {}) : undefined"
          :trend-tone="metric.trendTone"
          :icon="metric.icon"
        />
      </section>

      <!--
        The chart and the snapshot are one row of equal height: both are "where
        does the operation stand", read together.
      -->
      <section class="dashboard-grid dashboard-grid--aligned">
        <BaseCard
          :title="$t('admin.dashboard.weeklyTitle')"
          :description="$t('admin.dashboard.weeklyDescription')"
        >
          <BaseEmptyState
            v-if="weeklyHours.length === 0"
            :title="$t('admin.dashboard.weeklyEmptyTitle')"
            :description="$t('admin.dashboard.weeklyEmptyDescription')"
          />
          <div v-else class="chart-shell">
            <BaseChart type="bar" :data="weeklyChart" :options="weeklyOptions" />
          </div>
        </BaseCard>

        <BaseCard :title="$t('admin.dashboard.snapshotTitle')" :description="$t('admin.dashboard.snapshotDescription')">
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

      <nav class="quick-actions-rail" :aria-label="$t('admin.dashboard.quickActions')">
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

      <!--
        Recent activity is tall; Device status and Internship progress are two
        short panels that fill the column beside it. Previously the second column
        held only Device status and ran out halfway down the row.
      -->
      <section class="dashboard-grid dashboard-grid--estate">
        <BaseCard :title="$t('admin.dashboard.activityTitle')" :description="$t('admin.dashboard.activityDescription')">
          <div v-if="dashboardStore.activity.length" class="activity-list">
            <article v-for="item in dashboardStore.activity" :key="item.id" class="activity-item">
              <div>
                <h3>{{ $t(item.titleKey, activityTitleParams(item)) }}</h3>
                <p>{{ activityDescription(item) }}</p>
              </div>
              <BaseStatusPill :label="item.timestamp" :tone="item.tone" />
            </article>
          </div>
          <BaseEmptyState
            v-else
            :title="$t('admin.dashboard.activityEmptyTitle')"
            :description="$t('admin.dashboard.activityEmptyDescription')"
          />
        </BaseCard>

        <div class="estate-column">
          <BaseCard :title="$t('admin.dashboard.devicesTitle')" :description="$t('admin.dashboard.devicesDescription')">
            <div v-if="devicesStore.items.length" class="device-status-list">
              <article v-for="device in devicesStore.items" :key="device.id" class="device-status-item">
                <div>
                  <h3>{{ device.name }}</h3>
                  <p>
                    {{
                      $t("admin.dashboard.deviceLine", {
                        location: device.location,
                        queue: device.queueSize,
                        when: formatTimestamp(device.lastHeartbeatAt),
                      })
                    }}
                  </p>
                </div>
                <BaseStatusPill
                  :label="deviceStatusLabel(device.status)"
                  :tone="device.status === 'online' ? 'success' : device.status === 'offline' ? 'danger' : 'warning'"
                />
              </article>
            </div>
            <BaseEmptyState
              v-else
              :title="$t('admin.dashboard.devicesEmptyTitle')"
              :description="$t('admin.dashboard.devicesEmptyDescription')"
            />
          </BaseCard>

          <BaseCard
            :title="$t('admin.dashboard.internshipsTitle')"
            :description="$t('admin.dashboard.internshipsDescription')"
          >
            <BaseEmptyState
              v-if="activeInternships.length === 0"
              :title="$t('admin.dashboard.internshipsEmptyTitle')"
              :description="$t('admin.dashboard.internshipsEmptyDescription')"
            />

            <ul v-else class="internship-list">
              <li v-for="internship in activeInternships" :key="internship.id" class="internship-list__row">
                <div class="internship-list__head">
                  <span class="internship-list__name">{{ internship.studentName }}</span>
                  <span class="type-meta">
                    {{
                      $t("admin.dashboard.internshipHoursLine", {
                        done: internship.completedHours,
                        required: internship.requiredHours,
                        date: formatIsoDate(internship.endDate),
                      })
                    }}
                  </span>
                </div>

                <!--
                  Two rails: hours done, and calendar elapsed. Either alone is
                  meaningless — 40% of the hours is fine at 40% of the time and a
                  problem at 85%.
                -->
                <div class="dual-progress">
                  <div class="dual-progress__track">
                    <div class="dual-progress__fill" :style="{ width: `${hourPercent(internship)}%` }" />
                  </div>
                  <div
                    v-if="elapsedPercent(internship.startDate, internship.endDate) !== null"
                    class="dual-progress__track dual-progress__track--elapsed"
                  >
                    <div
                      class="dual-progress__fill dual-progress__fill--elapsed"
                      :style="{ width: `${elapsedPercent(internship.startDate, internship.endDate)}%` }"
                    />
                  </div>
                </div>

                <span class="type-meta">
                  {{
                    $t("admin.dashboard.internshipPaceLine", {
                      hours: hourPercent(internship),
                      elapsed: elapsedPercent(internship.startDate, internship.endDate) ?? 0,
                    })
                  }}
                </span>
              </li>
            </ul>
          </BaseCard>
        </div>
      </section>

      <!--
        Full width: it is the only list on this page that is a queue somebody has
        to clear, and it was previously boxed into half a row.
      -->
      <BaseCard
        :title="$t('admin.dashboard.correctionsTitle')"
        :description="
          openCorrections.length
            ? $t('admin.dashboard.correctionsWaitingDescription')
            : $t('admin.dashboard.correctionsAllAnswered')
        "
      >
        <BaseEmptyState
          v-if="openCorrections.length === 0"
          :title="$t('admin.dashboard.correctionsEmptyTitle')"
          :description="$t('admin.dashboard.correctionsEmptyDescription')"
        />

        <ul v-else class="correction-list">
          <li v-for="request in openCorrections" :key="request.id" class="correction-list__row">
            <div class="correction-list__main">
              <span class="correction-list__title">{{ request.memberName }}</span>
              <span class="type-meta">
                {{
                  $t("admin.dashboard.correctionLine", {
                    date: formatIsoDate(request.recordDate),
                    device: request.recordDevice ?? $t("admin.dashboard.noDevice"),
                    when: formatRelativeTime(request.createdAt),
                  })
                }}
              </span>
              <span class="type-meta correction-list__reason">{{ request.reason }}</span>
            </div>
            <BaseButton :label="$t('admin.dashboard.review')" severity="secondary" outlined size="small" @click="goToRoute('attendance')" />
          </li>
        </ul>
      </BaseCard>
    </template>
  </section>
</template>

<style scoped>
/* Both cards in the row are the same height, so the chart and the list align. */
.dashboard-grid--aligned {
  align-items: stretch;
}

.dashboard-grid--estate {
  align-items: start;
}

.estate-column {
  display: grid;
  gap: var(--space-4);
}

.internship-list,
.correction-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.internship-list__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) 0;
}

.internship-list__row:not(:last-child),
.correction-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.internship-list__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.internship-list__name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.dual-progress {
  display: grid;
  gap: 3px;
}

.dual-progress__track {
  height: 6px;
  border-radius: var(--radius-pill);
  overflow: hidden;
  background: var(--track);
}

.dual-progress__track--elapsed {
  height: 3px;
}

.dual-progress__fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width var(--transition-base);
}

.dual-progress__fill--elapsed {
  background: var(--foreground-muted);
}

.correction-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.correction-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.correction-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.correction-list__reason {
  color: var(--foreground-secondary);
}
</style>
