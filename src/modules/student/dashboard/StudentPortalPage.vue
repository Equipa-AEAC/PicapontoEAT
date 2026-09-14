<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { ChartData, ChartOptions } from "chart.js";
import { PhArrowRight, PhNotePencil, PhWarningCircle } from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseChart,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BasePageHeader,
  BaseStatsCard,
  BaseStatusPill,
} from "../../../shared/components/base";
import CalendarMonthGrid from "../../../components/calendar/CalendarMonthGrid.vue";
import type { CalendarDayInfo } from "../../../components/calendar/CalendarMonthGrid.vue";
import {
  useAnnouncementsStore,
  useAttendanceCorrectionsStore,
  useAttendanceStore,
  useCalendarEventsStore,
  useCertificatesStore,
  useInternshipReportsStore,
  useParticipationStore,
  usePortalStore,
  useProfileChangeRequestsStore,
  useProjectsStore,
  useStudentPreferencesStore,
} from "../../../shared/stores";
import type { StudentAlertCategory } from "../../../shared/types";
import { useAuthStore } from "../../../modules/authentication";
import { useChartTheme } from "../../../composables/useChartTheme";
import { hoursByWeekOfMonth } from "../../../shared/utils/attendanceStats";
import { formatHours } from "../../../shared/utils/participation";
import { formatIsoDate, todayIsoDate } from "../../../shared/utils/date";
import { t } from "../../../i18n";
import {
  attendanceStatusLabel,
  certificateRequestStatusLabel,
  correctionStatusLabel,
  dailyLogStatusLabel,
  participationKindLabel,
  reportStatusLabel,
} from "../../../i18n/vocabulary";

/**
 * The student dashboard, rebuilt around three questions in order: what needs me,
 * where do I stand, and what is coming.
 *
 * What it replaced, and why:
 *
 *   - An "Attendance calendar" card that was seven of the member's most recent
 *     records laid in a row under the description "across the current week". It
 *     was not a week and it was not a calendar. It is now the actual month, and
 *     clicking a day opens that day on the Calendar page.
 *   - A "Weekly and monthly rhythm" card stacking hours by day-of-week across the
 *     entire record — the aggregation that produces "51 hours on Monday", a
 *     number no day ever contained. Replaced by hours per week of the current
 *     month, where each bar is a real stretch of consecutive days.
 *   - "Internship oversight" and "Achievements", which were verbatim copies of
 *     what Profile and Worked Hours already show. A dashboard card that repeats
 *     another page costs a scroll and returns nothing.
 *
 * What it adds is the thing the portal had nowhere to put: a single list of what
 * is waiting on this member, assembled from the records that actually carry a
 * decision — corrections, reports, certificates, profile requests, announcements
 * and deadlines. Which categories appear is the student's own choice, made in
 * Settings.
 */
const router = useRouter();
const authStore = useAuthStore();
const portalStore = usePortalStore();
const attendanceStore = useAttendanceStore();
const participationStore = useParticipationStore();
const correctionsStore = useAttendanceCorrectionsStore();
const reportsStore = useInternshipReportsStore();
const certificatesStore = useCertificatesStore();
const profileRequestsStore = useProfileChangeRequestsStore();
const announcementsStore = useAnnouncementsStore();
const projectsStore = useProjectsStore();
const eventsStore = useCalendarEventsStore();
const preferencesStore = useStudentPreferencesStore();
const { palette, baseOptions } = useChartTheme();

const loadError = ref<string | null>(null);

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

const portal = computed(() => portalStore.summary);
const today = todayIsoDate();
const thisMonth = today.slice(0, 7);

const myAttendance = computed(() => attendanceStore.items.filter((row) => row.studentId === memberId.value));

/* ------------------------------------------------------------- Headline */

const hours = computed(() => participationStore.hours);

const isIntern = computed(() => (portal.value?.internshipHours ?? 0) > 0 || (portal.value?.remainingHours ?? 0) > 0);

const internshipProgress = computed(() => portal.value?.internshipProgress ?? 0);

const monthHours = computed(
  () =>
    Math.round(
      myAttendance.value
        .filter((row) => row.date.startsWith(thisMonth))
        .reduce((total, row) => total + (row.hours ?? 0), 0) * 10,
    ) / 10,
);

const currentParticipation = computed(() => {
  const timeline = participationStore.timeline;
  return timeline.find((entry) => entry.period.endDate === null) ?? timeline[0] ?? null;
});

const currentLabel = computed(() =>
  currentParticipation.value
    ? participationKindLabel(currentParticipation.value.period.kind)
    : t("student.dashboard.notRecorded"),
);

/* -------------------------------------------------- Needs your attention */

interface Alert {
  id: string;
  category: StudentAlertCategory;
  title: string;
  detail: string;
  tone: "danger" | "warning" | "info" | "success";
  actionLabel: string;
  route: string;
}

/**
 * Every alert is a record that exists, not a reminder somebody wrote.
 *
 * The rule this list is built to: if there is nothing in the data, there is no
 * row. An empty list is a real answer and says so, rather than being padded with
 * encouragement.
 */
const alerts = computed<Alert[]>(() => {
  const rows: Alert[] = [];

  for (const request of correctionsStore.myRequests) {
    if (request.status === "approved" || request.status === "rejected") {
      // Only worth flagging while it is recent enough to be news.
      if (request.resolvedAt && Date.now() - Date.parse(request.resolvedAt) < 14 * 86_400_000) {
        rows.push({
          id: `corr-${request.id}`,
          category: "attendance-corrections",
          title: t("student.dashboard.alertCorrection", { status: correctionStatusLabel(request.status) }),
          detail: t("student.dashboard.alertCorrectionDetail", {
            date: formatIsoDate(request.recordDate),
            note: request.resolutionNote || t("student.dashboard.alertNoNote"),
          }),
          tone: request.status === "approved" ? "success" : "warning",
          actionLabel: t("student.dashboard.alertOpenAttendance"),
          route: "student-attendance",
        });
      }
    }
  }

  for (const report of reportsStore.monthlyReports) {
    if (report.status === "rejected") {
      rows.push({
        id: `mr-${report.id}`,
        category: "report-reviews",
        title: t("student.dashboard.alertReportReturned", { month: report.month }),
        detail: report.reviewNote || t("student.dashboard.alertReopenAndResubmit"),
        tone: "danger",
        actionLabel: t("student.dashboard.openReports"),
        route: "student-reports",
      });
    } else if (report.status === "draft") {
      rows.push({
        id: `mrd-${report.id}`,
        category: "report-reviews",
        title: t("student.dashboard.alertReportDraft", { month: report.month }),
        detail: t("student.dashboard.alertReportDraftDetail"),
        tone: "warning",
        actionLabel: t("student.dashboard.alertFinishIt"),
        route: "student-reports",
      });
    }
  }

  const final = reportsStore.finalReport;

  if (final?.status === "rejected") {
    rows.push({
      id: "final-rejected",
      category: "report-reviews",
      title: t("student.dashboard.alertFinalReturned"),
      detail: final.reviewNote || t("student.dashboard.alertReopenAndResubmit"),
      tone: "danger",
      actionLabel: t("student.dashboard.openReports"),
      route: "student-reports",
    });
  }

  for (const request of certificatesStore.myRequests) {
    if (request.status !== "requested" && request.reviewedAt) {
      if (Date.now() - Date.parse(request.reviewedAt) < 14 * 86_400_000) {
        rows.push({
          id: `cert-${request.id}`,
          category: "certificate-requests",
          title: t("student.dashboard.alertCertificate", {
            status: certificateRequestStatusLabel(request.status),
          }),
          detail:
            request.reviewNote ||
            (request.status === "approved"
              ? t("student.dashboard.alertCertificateReady")
              : t("student.dashboard.alertNoNote")),
          tone: request.status === "approved" ? "success" : "warning",
          actionLabel: t("student.dashboard.alertOpenCertificates"),
          route: "student-certificates",
        });
      }
    }
  }

  for (const request of profileRequestsStore.answeredRequests) {
    if (request.resolvedAt && Date.now() - Date.parse(request.resolvedAt) < 14 * 86_400_000) {
      rows.push({
        id: `pcr-${request.id}`,
        category: "profile-requests",
        title: t("student.dashboard.alertProfile", { status: correctionStatusLabel(request.status) }),
        detail:
          request.resolutionNote ||
          (request.appliedToRecord
            ? t("student.dashboard.alertProfileApplied")
            : t("student.dashboard.alertNoNote")),
        tone: request.status === "approved" ? "success" : "warning",
        actionLabel: t("student.dashboard.alertOpenProfile"),
        route: "student-profile",
      });
    }
  }

  if (announcementsStore.unreadCount > 0) {
    rows.push({
      id: "announcements",
      category: "announcements",
      title: t("student.dashboard.alertUnread", { count: announcementsStore.unreadCount }, announcementsStore.unreadCount),
      detail: t("student.dashboard.alertUnreadDetail"),
      tone: "info",
      actionLabel: t("student.dashboard.alertReadThem"),
      route: "student-announcements",
    });
  }

  const overdue = projectsStore.memberProjectTasks.filter((task) => task.isOverdue);
  const dueSoon = projectsStore.memberProjectTasks.filter(
    (task) => !task.isOverdue && task.status !== "done" && task.dueLabel !== null,
  );

  if (overdue.length > 0) {
    rows.push({
      id: "tasks-overdue",
      category: "task-deadlines",
      title: t("student.dashboard.alertOverdue", { count: overdue.length }, overdue.length),
      detail: overdue.map((task) => task.title).slice(0, 3).join(" · "),
      tone: "danger",
      actionLabel: t("student.dashboard.alertOpenTasks"),
      route: "student-tasks",
    });
  }

  if (dueSoon.length > 0) {
    rows.push({
      id: "tasks-soon",
      category: "task-deadlines",
      title: t("student.dashboard.alertDueSoon", { count: dueSoon.length }, dueSoon.length),
      detail: dueSoon.map((task) => `${task.title} — ${task.dueLabel}`).slice(0, 3).join(" · "),
      tone: "warning",
      actionLabel: t("student.dashboard.alertOpenTasks"),
      route: "student-tasks",
    });
  }

  // The student's own choice about what they want flagged, applied last.
  return rows.filter((row) => preferencesStore.alertEnabled(row.category));
});

/* --------------------------------------------------------------- Month */

const dayInfo = computed(() => {
  const info: Record<string, CalendarDayInfo> = {};

  function ensure(date: string): CalendarDayInfo {
    info[date] ??= { status: null, statusLabel: "", hours: null, eventCount: 0, taskCount: 0 };
    return info[date];
  }

  for (const row of myAttendance.value) {
    if (!row.date.startsWith(thisMonth)) continue;
    const day = ensure(row.date);
    day.status = row.status;
    day.statusLabel = attendanceStatusLabel(row.status);
    day.hours = row.hours;
  }

  for (const event of eventsStore.items) {
    if (!event.date.startsWith(thisMonth)) continue;
    ensure(event.date).eventCount += 1;
  }

  for (const task of projectsStore.memberProjectTasks) {
    if (!task.dueDate?.startsWith(thisMonth)) continue;
    ensure(task.dueDate).taskCount += 1;
  }

  return info;
});

const calendarMonth = ref(thisMonth);

/** The dashboard's calendar is a way in, not a second calendar page. */
function openCalendarOn(date: string) {
  void router.push({ name: "student-calendar", query: { date } });
}

/* ------------------------------------------------------------- Up next */

/** Events and deadlines from today onwards, merged into one chronological list. */
const upcoming = computed(() => {
  const rows: Array<{ id: string; date: string; title: string; detail: string; kind: "event" | "task" }> = [
    ...eventsStore.items
      .filter((event) => event.date >= today)
      .map((event) => ({
        id: `e-${event.id}`,
        date: event.date,
        title: event.title,
        detail: event.startTime ? `${event.startTime} · ${event.authorName}` : event.authorName,
        kind: "event" as const,
      })),
    ...projectsStore.memberProjectTasks
      .filter((task) => task.status !== "done" && task.dueDate !== null && task.dueDate >= today)
      .map((task) => ({
        id: `t-${task.id}`,
        date: task.dueDate!,
        title: task.title,
        detail: task.projectName,
        kind: "task" as const,
      })),
  ];

  return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
});

/* ------------------------------------------------------- Hours by week */

const weeklyHours = computed(() => hoursByWeekOfMonth(myAttendance.value, thisMonth));

const weeklyChart = computed<ChartData<"bar">>(() => ({
  labels: weeklyHours.value.map((point) => point.label),
  datasets: [
    {
      label: t("student.dashboard.weeklySeries"),
      data: weeklyHours.value.map((point) => point.value),
      backgroundColor: palette.value.series[0],
      borderRadius: 2,
      borderSkipped: false,
      maxBarThickness: 44,
    },
  ],
}));

const weeklyOptions = computed<ChartOptions<"bar">>(() => baseOptions.value as ChartOptions<"bar">);

/* ------------------------------------------------------ Recent activity */

const recentAttendance = computed(() =>
  myAttendance.value.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
);

const recentEntries = computed(() =>
  reportsStore.dailyLogs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
);

const busy = computed(() => portalStore.loading || attendanceStore.loading);

async function load() {
  loadError.value = null;
  attendanceStore.filters.studentId = memberId.value;

  try {
    await Promise.all([
      portalStore.loadPortalSummary(memberId.value),
      attendanceStore.loadAttendance(),
      participationStore.load(memberId.value),
      correctionsStore.loadMyRequests(),
      reportsStore.loadStudentReports(memberId.value),
      certificatesStore.loadForMember(memberId.value),
      profileRequestsStore.loadMyRequests(memberId.value),
      projectsStore.loadMemberWorkspace(memberId.value),
      eventsStore.loadForMember(memberId.value),
      announcementsStore.refreshUnreadCount(memberId.value, isIntern.value ? "official-internship" : "equipa-hours"),
    ]);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t("student.dashboard.loadFailed");
  }
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="portal?.profile.fullName ?? $t('student.dashboard.fallbackTitle')"
      :description="
        portal
          ? `${portal.profile.course} • ${portal.profile.className} • ${currentLabel}`
          : $t('student.dashboard.loading')
      "
    >
      <template #actions>
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="busy"
          @click="load"
        />
        <BaseButton @click="router.push({ name: 'student-daily-log' })">
          <PhNotePencil weight="bold" />
          {{ $t("student.dashboard.writeEntry") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="loadError"
      :title="$t('student.dashboard.unavailable')"
      :message="loadError"
      @retry="load"
    />
    <BaseErrorState v-else-if="portalStore.errorMessage" :message="portalStore.errorMessage" @retry="load" />

    <BaseLoading v-if="busy && !portal" />

    <template v-else-if="portal">
      <!--
        Four figures, each answering a question the member actually asks. The two
        hour buckets stay apart: one counts towards the FCT requirement and one
        does not, and a combined total would hide that.
      -->
      <section class="metric-grid">
        <BaseStatsCard
          v-if="isIntern"
          :label="$t('student.dashboard.metricInternship')"
          :value="`${internshipProgress}%`"
          :caption="
            $t('student.dashboard.metricInternshipCaption', {
              done: formatHours(portal.internshipHours),
              required: formatHours(portal.internshipHours + portal.remainingHours),
            })
          "
        />
        <BaseStatsCard
          v-else
          :label="$t('student.dashboard.metricTeamHours')"
          :value="formatHours(hours?.teamHours ?? 0)"
          :caption="$t('student.dashboard.metricTeamHoursCaptionTeam')"
        />
        <BaseStatsCard
          v-if="isIntern"
          :label="$t('student.dashboard.metricTeamHours')"
          :value="formatHours(hours?.teamHours ?? 0)"
          :caption="$t('student.dashboard.metricTeamHoursCaptionIntern')"
        />
        <BaseStatsCard
          v-else
          :label="$t('student.dashboard.metricDays')"
          :value="String(myAttendance.length)"
          :caption="$t('student.dashboard.metricDaysCaption')"
        />
        <BaseStatsCard
          :label="$t('student.dashboard.metricToday')"
          :value="attendanceStatusLabel(portal.attendanceToday)"
          :caption="$t('student.dashboard.metricTodayCaption')"
        />
        <BaseStatsCard
          :label="$t('student.dashboard.metricMonth')"
          :value="formatHours(monthHours)"
          :caption="$t('student.dashboard.metricMonthCaption')"
        />
      </section>

      <!-- What needs the member, before anything they merely might like to see. -->
      <BaseCard
        :title="$t('student.dashboard.attentionTitle')"
        :description="
          alerts.length
            ? $t('student.dashboard.attentionDescription')
            : $t('student.dashboard.attentionNone')
        "
      >
        <BaseEmptyState
          v-if="alerts.length === 0"
          :title="$t('student.dashboard.attentionEmptyTitle')"
          :description="$t('student.dashboard.attentionEmptyDescription')"
        />

        <ul v-else class="alert-list">
          <li v-for="alert in alerts" :key="alert.id" class="alert-list__row">
            <span class="alert-list__rail" :class="`alert-list__rail--${alert.tone}`" aria-hidden="true" />
            <div class="alert-list__main">
              <span class="alert-list__title">{{ alert.title }}</span>
              <span class="type-meta alert-list__detail">{{ alert.detail }}</span>
            </div>
            <BaseButton
              :label="alert.actionLabel"
              severity="secondary"
              text
              size="small"
              @click="router.push({ name: alert.route })"
            />
          </li>
        </ul>
      </BaseCard>

      <section class="dashboard-grid">
        <BaseCard
          :title="$t('student.dashboard.monthTitle')"
          :description="$t('student.dashboard.monthDescription')"
        >
          <CalendarMonthGrid
            :month="calendarMonth"
            :selected="today"
            :days="dayInfo"
            :summary="$t('student.dashboard.monthRecorded', { hours: formatHours(monthHours) })"
            @update:month="calendarMonth = $event"
            @select="openCalendarOn"
          />
        </BaseCard>

        <BaseCard
          :title="$t('student.dashboard.upNextTitle')"
          :description="$t('student.dashboard.upNextDescription')"
        >
          <BaseEmptyState
            v-if="upcoming.length === 0"
            :title="$t('student.dashboard.upNextEmptyTitle')"
            :description="$t('student.dashboard.upNextEmptyDescription')"
            :action-label="$t('student.dashboard.openCalendar')"
            @action="router.push({ name: 'student-calendar' })"
          />

          <ul v-else class="upcoming-list">
            <li v-for="item in upcoming" :key="item.id" class="upcoming-list__row">
              <span class="upcoming-list__date type-numeric">{{ formatIsoDate(item.date) }}</span>
              <div class="upcoming-list__main">
                <span class="upcoming-list__title">{{ item.title }}</span>
                <span class="type-meta">{{ item.detail }}</span>
              </div>
              <BaseBadge
                :label="item.kind === 'event' ? $t('student.dashboard.event') : $t('student.dashboard.due')"
                :tone="item.kind === 'event' ? 'info' : 'warning'"
              />
            </li>
          </ul>

          <template #footer>
            <BaseButton severity="secondary" text @click="router.push({ name: 'student-calendar' })">
              {{ $t("student.dashboard.openTheCalendar") }}
              <PhArrowRight weight="bold" />
            </BaseButton>
          </template>
        </BaseCard>
      </section>

      <section class="dashboard-grid">
        <!--
          Weeks of the month, not days of the week. A bar here is a real stretch
          of consecutive days somebody worked, which is what "how was my month"
          means; stacking every Monday of the year answers a question nobody asks.
        -->
        <BaseCard
          :title="$t('student.dashboard.weeklyTitle')"
          :description="$t('student.dashboard.weeklyDescription')"
        >
          <BaseEmptyState
            v-if="monthHours === 0"
            :title="$t('student.dashboard.weeklyEmptyTitle')"
            :description="$t('student.dashboard.weeklyEmptyDescription')"
          />
          <div v-else class="chart-shell">
            <BaseChart type="bar" :data="weeklyChart" :options="weeklyOptions" />
          </div>
        </BaseCard>

        <BaseCard
          :title="$t('student.dashboard.activityTitle')"
          :description="$t('student.dashboard.activityDescription')"
        >
          <BaseEmptyState
            v-if="recentAttendance.length === 0 && recentEntries.length === 0"
            :title="$t('student.dashboard.activityEmptyTitle')"
            :description="$t('student.dashboard.activityEmptyDescription')"
          />

          <template v-else>
            <p v-if="recentAttendance.length" class="type-eyebrow activity-title">
              {{ $t("student.dashboard.activityAttendance") }}
            </p>
            <ul class="activity-list">
              <li v-for="record in recentAttendance" :key="record.id" class="activity-list__row">
                <span class="activity-list__date type-numeric">{{ formatIsoDate(record.date) }}</span>
                <span class="type-meta">{{ record.entry ?? '—' }} – {{ record.exit ?? '—' }}</span>
                <span class="type-meta">{{ $t("common.time.hoursShort", { count: record.hours ?? 0 }) }}</span>
                <BaseStatusPill
                  :label="attendanceStatusLabel(record.status)"
                  :tone="record.status === 'present' ? 'success' : record.status === 'corrected' ? 'info' : record.status === 'late' ? 'warning' : 'danger'"
                />
              </li>
            </ul>

            <p v-if="recentEntries.length" class="type-eyebrow activity-title">
              {{ $t("student.dashboard.activityEntries") }}
            </p>
            <ul v-if="recentEntries.length" class="activity-list">
              <li v-for="entry in recentEntries" :key="entry.id" class="activity-list__row activity-list__row--entry">
                <span class="activity-list__date type-numeric">{{ formatIsoDate(entry.date) }}</span>
                <span class="activity-list__text">{{ entry.activities }}</span>
                <BaseBadge
                  :label="dailyLogStatusLabel(entry.status)"
                  :tone="entry.status === 'submitted' ? 'success' : 'warning'"
                />
              </li>
            </ul>
          </template>

          <template #footer>
            <BaseButton severity="secondary" text @click="router.push({ name: 'student-attendance' })">
              {{ $t("student.dashboard.fullAttendance") }}
              <PhArrowRight weight="bold" />
            </BaseButton>
          </template>
        </BaseCard>
      </section>

      <!--
        Report status is only shown to members who have a placement to report on.
        For everyone else it is not a section that is empty — it is a section that
        does not apply.
      -->
      <BaseCard
        v-if="isIntern"
        :title="$t('student.dashboard.reportsTitle')"
        :description="$t('student.dashboard.reportsDescription')"
      >
        <ul class="report-status-list">
          <li v-for="report in reportsStore.monthlyReports" :key="report.id" class="report-status-list__row">
            <span class="report-status-list__month">{{ report.month }}</span>
            <span class="type-meta">
              {{
                $t(
                  "student.dashboard.reportEntries",
                  { count: report.entriesCount, hours: $t("common.time.hoursShort", { count: report.totalHours }) },
                  report.entriesCount,
                )
              }}
            </span>
            <BaseStatusPill
              :label="reportStatusLabel(report.status)"
              :tone="report.status === 'approved' ? 'success' : report.status === 'rejected' ? 'danger' : report.status === 'submitted' ? 'info' : 'warning'"
            />
          </li>
          <li v-if="reportsStore.finalReport" class="report-status-list__row">
            <span class="report-status-list__month">{{ $t("student.dashboard.finalReport") }}</span>
            <span class="type-meta">{{ $t("student.dashboard.finalReportName") }}</span>
            <BaseStatusPill
              :label="reportStatusLabel(reportsStore.finalReport.status)"
              :tone="reportsStore.finalReport.status === 'approved' ? 'success' : reportsStore.finalReport.status === 'rejected' ? 'danger' : reportsStore.finalReport.status === 'submitted' ? 'info' : 'warning'"
            />
          </li>
        </ul>

        <BaseEmptyState
          v-if="reportsStore.monthlyReports.length === 0"
          :title="$t('student.dashboard.reportsEmptyTitle')"
          :description="$t('student.dashboard.reportsEmptyDescription')"
          :action-label="$t('student.dashboard.openReports')"
          @action="router.push({ name: 'student-reports' })"
        />

        <template #footer>
          <BaseButton severity="secondary" text @click="router.push({ name: 'student-reports' })">
            {{ $t("student.dashboard.openInternshipReports") }}
            <PhArrowRight weight="bold" />
          </BaseButton>
        </template>
      </BaseCard>

      <p v-if="participationStore.hasUnclassified" class="form-error-banner">
        <PhWarningCircle weight="fill" />
        {{
          $t("student.dashboard.unclassified", {
            days: hours?.unclassifiedDays ?? 0,
            hours: formatHours(hours?.unclassifiedHours ?? 0),
          })
        }}
      </p>
    </template>
  </section>
</template>

<style scoped>
.alert-list,
.upcoming-list,
.activity-list,
.report-status-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.alert-list__row {
  display: grid;
  grid-template-columns: 3px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.alert-list__row:not(:last-child),
.upcoming-list__row:not(:last-child),
.activity-list__row:not(:last-child),
.report-status-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.alert-list__rail {
  align-self: stretch;
  border-radius: var(--radius-pill);
  min-height: 28px;
}

.alert-list__rail--danger {
  background: var(--danger);
}

.alert-list__rail--warning {
  background: var(--warning);
}

.alert-list__rail--info {
  background: var(--info);
}

.alert-list__rail--success {
  background: var(--success);
}

.alert-list__main,
.upcoming-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.alert-list__title,
.upcoming-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.alert-list__detail {
  overflow: hidden;
  text-overflow: ellipsis;
}

.upcoming-list__row {
  display: grid;
  grid-template-columns: minmax(96px, auto) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.upcoming-list__date,
.activity-list__date {
  font-size: var(--text-xs);
  color: var(--foreground-secondary);
  white-space: nowrap;
}

.activity-list__row {
  display: grid;
  grid-template-columns: minmax(96px, auto) minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.activity-list__row--entry {
  grid-template-columns: minmax(96px, auto) minmax(0, 1fr) auto;
}

.activity-list__text {
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-title {
  margin: var(--space-4) 0 var(--space-1);
  color: var(--foreground-secondary);
}

.activity-title:first-child {
  margin-top: 0;
}

.report-status-list__row {
  display: grid;
  grid-template-columns: minmax(120px, auto) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.report-status-list__month {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

@media (max-width: 720px) {
  .activity-list__row,
  .upcoming-list__row,
  .report-status-list__row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: var(--space-1);
  }
}

/*
 * `.dashboard-grid` deliberately leaves paired cards at their own height
 * (`align-items: start`) elsewhere, but on this page it pairs a naturally
 * tall card (the month grid, the multi-section activity list) with a short
 * one (a one-line "up next" list, an empty chart state). Left alone that
 * reads as a large dead patch of page background beside the short card
 * rather than a short card. Stretching the pair and letting the body absorb
 * the extra height keeps both card borders level and pins each footer to
 * the same baseline, instead of leaving a gap outside any card.
 */
.dashboard-grid {
  align-items: stretch;
}

.dashboard-grid :deep(.base-card__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.dashboard-grid :deep(.base-empty-state) {
  flex: 1;
  justify-content: center;
}
</style>
