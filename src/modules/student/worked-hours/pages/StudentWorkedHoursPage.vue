<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { ChartData, ChartOptions } from "chart.js";

import { BaseButton, BaseCard, BaseChart, BaseDataCard, BaseEmptyState,
  BaseErrorState, BaseLoading, BasePageHeader, BaseSection, BaseStatusPill, BaseTable, BaseTableColumn } from "../../../../shared/components/base";
import { useAttendanceStore, usePortalStore } from "../../../../shared/stores";
import { useParticipationStore } from "../../../../stores/participation";
import ParticipationTimeline from "../../../../components/participation/ParticipationTimeline.vue";
import { formatHours } from "../../../../utils/participation";
import { useChartTheme } from "../../../../composables/useChartTheme";
import { useAuthStore } from "../../../../modules/authentication";
import { hoursByCalendarWeek, mostRecent } from "../../../../shared/utils/attendanceStats";
import { formatIsoDate } from "../../../../shared/utils/date";
import { t } from "../../../../i18n";
import { attendanceStatusLabel, participationKindLabel } from "../../../../i18n/vocabulary";

const portalStore = usePortalStore();
const attendanceStore = useAttendanceStore();
const participationStore = useParticipationStore();
const authStore = useAuthStore();
const { palette, baseOptions } = useChartTheme();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

/**
 * The chart and the table are the member's own attendance.
 *
 * Both used to read hand-written arrays on the portal summary. The table sat
 * under the heading "the days behind the totals above" while listing three fixed
 * July rows that were behind no total at all, and the bar chart plotted hours on
 * weekdays this member never worked.
 */
const myAttendance = computed(() => attendanceStore.items.filter((row) => row.studentId === memberId.value));
const attendance = computed(() => mostRecent(myAttendance.value, 20));

/**
 * Hours per calendar week, oldest first.
 *
 * This was `hoursByWeekday`, which stacked every Monday in the member's whole
 * record into one column — producing totals like "51 hours on Monday" that no
 * day ever held, and answering a question ("which weekday do I tend to work?")
 * that nobody looking at their placement progress is asking. Each bar is now a
 * real, consecutive week, labelled by the Monday it starts on, so the shape of
 * the chart is the shape of the work.
 */
const weeklyHours = computed(() => hoursByCalendarWeek(myAttendance.value, 10));

const weeklyChart = computed<ChartData<'bar'>>(() => ({
  labels: weeklyHours.value.map((item) => item.label),
  datasets: [
    {
      label: t("student.workedHours.weeklySeries"),
      data: weeklyHours.value.map((item) => item.value),
      backgroundColor: palette.value.series[0],
      borderRadius: 2,
      borderSkipped: false,
      maxBarThickness: 40,
    },
  ],
}));

const progressChart = computed<ChartData<'doughnut'>>(() => ({
  labels: [t("student.workedHours.chartCompleted"), t("student.workedHours.chartRemaining")],
  datasets: [
    {
      data: [portalStore.summary?.completedHours ?? 0, portalStore.summary?.remainingHours ?? 0],
      backgroundColor: [palette.value.success, palette.value.track],
      borderWidth: 0,
    },
  ],
}));

const barOptions = computed<ChartOptions<'bar'>>(() => baseOptions.value as ChartOptions<'bar'>);

const doughnutOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: palette.value.muted, boxWidth: 10, boxHeight: 10, font: { size: 12 } },
    },
  },
}));

/** The canonical `AttendanceStatus` set — `BaseStatusPill` has no neutral tone. */
function statusTone(status: string): "success" | "warning" | "danger" | "info" {
  if (status === "present") return "success";
  if (status === "corrected") return "info";
  if (status === "missing") return "danger";
  return "warning";
}

const completionProgress = computed(() => {
  const completed = portalStore.summary?.completedHours ?? 0;
  const remaining = portalStore.summary?.remainingHours ?? 0;
  const total = completed + remaining;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
});

/**
 * What the student is doing now, in their own words.
 *
 * Read from the open participation period rather than from a status field, so
 * "since" is a real date the student can check against their own memory.
 */
const currentParticipation = computed(() => {
  const current = participationStore.timeline.find((entry) => entry.period.endDate === null);
  return current ?? participationStore.timeline[0] ?? null;
});

const currentLabel = computed(() =>
  currentParticipation.value
    ? participationKindLabel(currentParticipation.value.period.kind)
    : t("student.workedHours.notRecorded"),
);

async function load() {
  attendanceStore.filters.studentId = memberId.value;
  await Promise.all([
    portalStore.loadPortalSummary(memberId.value),
    attendanceStore.loadAttendance(),
    participationStore.load(memberId.value),
  ]);
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('student.workedHours.title')"
      :description="$t('student.workedHours.description')"
    >
      <template #actions>
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="portalStore.loading"
          @click="load"
        />
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="portalStore.errorMessage"
      :message="portalStore.errorMessage"
      @retry="load"
    />

    <!--
      The two buckets are shown side by side and never added together. A single
      "total hours" figure would merge time that counts towards the FCT
      requirement with time that does not, which is the one thing a student
      cannot afford to misread.
    -->
    <section class="metric-grid">
      <BaseDataCard
        :title="$t('student.workedHours.internshipHours')"
        :value="formatHours(portalStore.summary?.internshipHours ?? 0)"
        :description="$t('student.workedHours.internshipHoursCaption')"
      />
      <BaseDataCard
        :title="$t('student.workedHours.teamHours')"
        :value="formatHours(portalStore.summary?.teamHours ?? 0)"
        :description="$t('student.workedHours.teamHoursCaption')"
      />
      <BaseDataCard
        :title="$t('student.workedHours.stillRequired')"
        :value="formatHours(portalStore.summary?.remainingHours ?? 0)"
        :description="$t('student.workedHours.stillRequiredCaption')"
      />
      <BaseDataCard
        :title="$t('student.workedHours.progress')"
        :value="`${completionProgress}%`"
        :description="
          $t('student.workedHours.progressCaption', {
            done: formatHours(portalStore.summary?.internshipHours ?? 0),
            required:
              portalStore.summary?.completedHours !== undefined
                ? formatHours((portalStore.summary?.internshipHours ?? 0) + (portalStore.summary?.remainingHours ?? 0))
                : '—',
          })
        "
      />
    </section>

    <BaseLoading v-if="portalStore.loading" />

    <template v-else>
      <BaseSection
        :title="$t('student.workedHours.participationTitle')"
        :description="$t('student.workedHours.participationDescription')"
      >
        <BaseCard>
          <p class="participation-current">
            <span class="type-label">{{ $t("student.workedHours.currently") }}</span>
            <strong>{{ currentLabel }}</strong>
            <span v-if="currentParticipation" class="type-meta">
              {{ $t("student.workedHours.since", { date: formatIsoDate(currentParticipation.period.startDate) }) }}
            </span>
          </p>

          <ParticipationTimeline :hours="participationStore.hours" :timeline="participationStore.timeline" />
        </BaseCard>
      </BaseSection>

      <section class="dashboard-grid">
        <BaseCard
          :title="$t('student.workedHours.weeklyTitle')"
          :description="$t('student.workedHours.weeklyDescription')"
        >
          <BaseEmptyState
            v-if="weeklyHours.length === 0"
            :title="$t('student.workedHours.weeklyEmptyTitle')"
            :description="$t('student.workedHours.weeklyEmptyDescription')"
          />
          <div v-else style="height: 260px;">
            <BaseChart type="bar" :data="weeklyChart" :options="barOptions" />
          </div>
        </BaseCard>

        <BaseCard
          :title="$t('student.workedHours.splitTitle')"
          :description="$t('student.workedHours.splitDescription')"
        >
          <div style="height: 260px;">
            <BaseChart type="doughnut" :data="progressChart" :options="doughnutOptions" />
          </div>
        </BaseCard>
      </section>

      <!--
        Milestones moved here from the Internship page, which showed the same
        three numbers this page already leads with and nothing else.
      -->
      <BaseSection
        :title="$t('student.workedHours.milestonesTitle')"
        :description="$t('student.workedHours.milestonesDescription')"
      >
        <BaseCard>
          <BaseEmptyState
            v-if="(portalStore.summary?.achievements ?? []).length === 0"
            :title="$t('student.workedHours.milestonesEmptyTitle')"
            :description="$t('student.workedHours.milestonesEmptyDescription')"
          />

          <ul v-else class="milestone-list">
            <li v-for="achievement in portalStore.summary?.achievements ?? []" :key="achievement.id" class="milestone-list__row">
              <span class="milestone-list__title">{{ achievement.title }}</span>
              <span class="type-meta">{{ achievement.description }}</span>
            </li>
          </ul>
        </BaseCard>
      </BaseSection>

      <!--
        Deliberately not "the days behind the totals above": the completed-hours
        figure is the FCT internship count maintained by the internship service,
        not the sum of these attendance rows. Saying so would be a claim the data
        does not support.
      -->
      <BaseSection
        :title="$t('student.workedHours.recentTitle')"
        :description="$t('student.workedHours.recentDescription')"
      >
        <BaseCard>
          <BaseTable :value="attendance" dataKey="id" paginator :rows="5">
            <template #empty>
              <BaseEmptyState
                :title="$t('student.workedHours.recentEmptyTitle')"
                :description="$t('student.workedHours.recentEmptyDescription')"
              />
            </template>

            <BaseTableColumn field="date" :header="$t('common.time.date')" sortable>
              <template #body="slotProps">{{ formatIsoDate(slotProps.data.date) }}</template>
            </BaseTableColumn>
            <BaseTableColumn field="entry" :header="$t('student.workedHours.colEntry')">
              <template #body="slotProps">{{ slotProps.data.entry ?? '—' }}</template>
            </BaseTableColumn>
            <BaseTableColumn field="exit" :header="$t('student.workedHours.colExit')">
              <template #body="slotProps">{{ slotProps.data.exit ?? '—' }}</template>
            </BaseTableColumn>
            <BaseTableColumn field="hours" :header="$t('common.fields.hours')" sortable>
              <template #body="slotProps">
                {{ $t("common.time.hoursShort", { count: slotProps.data.hours ?? 0 }) }}
              </template>
            </BaseTableColumn>
            <BaseTableColumn field="status" :header="$t('common.fields.status')">
              <template #body="slotProps">
                <BaseStatusPill
                  :label="attendanceStatusLabel(slotProps.data.status)"
                  :tone="statusTone(slotProps.data.status)"
                />
              </template>
            </BaseTableColumn>
          </BaseTable>
        </BaseCard>
      </BaseSection>
    </template>
  </section>
</template>

<style scoped>
.participation-current {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
}

.participation-current strong {
  font-size: var(--text-base);
}

.milestone-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.milestone-list__row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: var(--space-3) 0;
}

.milestone-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.milestone-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}
</style>
