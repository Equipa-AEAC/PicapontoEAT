<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PhCheckCircle, PhClockCounterClockwise, PhWarningCircle } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseLoading,
  BasePageHeader,
  BaseSelect,
  BaseStatsCard,
  BaseStatusPill,
} from "../../../../shared/components/base";
import CorrectionRequestDialog from "../../../../components/attendance/CorrectionRequestDialog.vue";
import {
  useAttendanceCorrectionsStore,
  useAttendanceStore,
  useParticipationStore,
} from "../../../../shared/stores";
import type { AttendanceSummary, CorrectionRequestFormValues } from "../../../../shared/types";
import { formatHours } from "../../../../shared/utils/participation";
import { formatIsoDate, formatRelativeTime } from "../../../../shared/utils/date";
import { useAuthStore } from "../../../../modules/authentication";
import { t } from "../../../../i18n";
import {
  attendanceStatusLabel,
  correctionKindShortLabel,
  correctionStatusLabel,
  participationKindLabel,
} from "../../../../i18n/vocabulary";

/**
 * The member's own attendance, and the one action they have on it.
 *
 * This was a read-only list of three rows. The gap it left was the important
 * one: the person who notices a wrong record first — the member it belongs to —
 * had no way to say so, and every correction had to start with a conversation
 * somewhere outside the system.
 */
const authStore = useAuthStore();
const attendanceStore = useAttendanceStore();
const correctionsStore = useAttendanceCorrectionsStore();
const participationStore = useParticipationStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization — see the note on
 * `authStore.currentMemberId`.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

const dialogRecord = ref<AttendanceSummary | null>(null);
const monthFilter = ref<string>("all");

/** Only this member's rows. The store filter is shared, so it is set explicitly. */
async function load() {
  attendanceStore.filters.studentId = memberId.value;
  await Promise.all([
    attendanceStore.loadAttendance(),
    correctionsStore.loadMyRequests(),
    participationStore.load(memberId.value),
  ]);
}

const records = computed(() => {
  const rows = attendanceStore.items.filter((row) => row.studentId === memberId.value);
  const month = monthFilter.value;

  return (month === "all" ? rows : rows.filter((row) => row.date.startsWith(month))).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
});

const monthOptions = computed(() => {
  const months = new Set(
    attendanceStore.items.filter((row) => row.studentId === memberId.value).map((row) => row.date.slice(0, 7)),
  );

  return [
    { label: t("student.attendance.allMonths"), value: "all" },
    ...[...months].sort().reverse().map((value) => ({ label: value, value })),
  ];
});

const totalHours = computed(() =>
  Math.round(records.value.reduce((total, row) => total + (row.hours ?? 0), 0) * 10) / 10,
);

/*
 * The cards above the list.
 *
 * They deliberately answer things the table cannot: the table shows one day per
 * row, so "how many days" and "how many hours in the view" are countable but
 * tedious, and the two hour buckets are not in the table at all — a row does not
 * know which participation period covered it.
 *
 * The two buckets are never added together. A single "total hours" figure would
 * merge time creditable to the FCT requirement with time that is not, which is
 * the one number a member cannot afford to misread. Both come from the
 * participation resolver, so this page agrees with Worked Hours by construction.
 */
const daysInView = computed(() => records.value.length);

const hours = computed(() => participationStore.hours);

/** What the member is doing now, read from the open period rather than a status flag. */
const currentParticipation = computed(() => {
  const timeline = participationStore.timeline;
  return timeline.find((entry) => entry.period.endDate === null) ?? timeline[0] ?? null;
});

const currentLabel = computed(() =>
  currentParticipation.value
    ? participationKindLabel(currentParticipation.value.period.kind)
    : t("student.attendance.notRecorded"),
);

const currentSince = computed(() =>
  currentParticipation.value
    ? t("student.attendance.since", { date: formatIsoDate(currentParticipation.value.period.startDate) })
    : t("student.attendance.noPeriodYet"),
);

/** The one figure that is a problem rather than a fact: days nothing accounts for. */
const unclassifiedDays = computed(() => hours.value?.unclassifiedDays ?? 0);

/** Requests still waiting, shown above the list so the member sees them first. */
const openRequests = computed(() => correctionsStore.myRequests.filter((request) => request.status === "pending"));

/** Answers the member has not seen acted on yet — the outcome of their asking. */
const resolvedRequests = computed(() =>
  correctionsStore.myRequests.filter((request) => request.status === "approved" || request.status === "rejected"),
);

function statusTone(status: AttendanceSummary["status"]) {
  if (status === "present") return "success";
  if (status === "corrected") return "info";
  if (status === "late") return "warning";
  return "danger";
}

function openDialog(record: AttendanceSummary) {
  correctionsStore.clearMessages();
  dialogRecord.value = record;
}

async function submitRequest(values: CorrectionRequestFormValues) {
  const created = await correctionsStore.submit(values);

  if (created) {
    dialogRecord.value = null;
    await attendanceStore.loadAttendance();
  }
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('student.attendance.title')"
      :description="$t('student.attendance.description')"
    >
      <template #actions>
        <BaseSelect
          :model-value="monthFilter"
          :options="monthOptions"
          @update:model-value="monthFilter = $event as string"
        />
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="attendanceStore.loading"
          @click="load"
        />
      </template>
    </BasePageHeader>

    <p v-if="correctionsStore.successMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ correctionsStore.successMessage }}
    </p>

    <p v-if="attendanceStore.errorMessage" class="form-error-banner">{{ attendanceStore.errorMessage }}</p>
    <p v-if="correctionsStore.errorMessage" class="form-error-banner">{{ correctionsStore.errorMessage }}</p>

    <section class="metric-grid">
      <BaseStatsCard
        :label="$t('student.attendance.metricParticipation')"
        :value="currentLabel"
        :caption="currentSince"
      />
      <BaseStatsCard
        :label="$t('student.attendance.metricTeamHours')"
        :value="formatHours(hours?.teamHours ?? 0)"
        :caption="$t('student.attendance.metricTeamHoursCaption')"
      />
      <BaseStatsCard
        :label="$t('student.attendance.metricInternshipHours')"
        :value="formatHours(hours?.internshipHours ?? 0)"
        :caption="$t('student.attendance.metricInternshipHoursCaption')"
      />
      <BaseStatsCard
        :label="$t('student.attendance.metricWaiting')"
        :value="String(openRequests.length)"
        :caption="
          openRequests.length
            ? $t('student.attendance.metricWaitingCaption')
            : $t('student.attendance.metricNothingWaiting')
        "
      />
    </section>

    <!--
      Unclassified days are a data problem, not a total. They are surfaced only
      when they exist rather than shown as a permanent zero, because the reader
      needs to act on them and there is nothing to act on at zero.
    -->
    <BaseCard
      v-if="unclassifiedDays > 0"
      :title="$t('student.attendance.unclassifiedTitle')"
      :description="
        $t(
          'student.attendance.unclassifiedDescription',
          { count: unclassifiedDays, hours: formatHours(hours?.unclassifiedHours ?? 0) },
          unclassifiedDays,
        )
      "
    />

    <!-- Anything the member has already raised comes before the list itself. -->
    <BaseCard
      v-if="openRequests.length"
      :title="$t('student.attendance.waitingTitle')"
      :description="$t('student.attendance.waitingDescription')"
    >
      <ul class="request-list">
        <li v-for="request in openRequests" :key="request.id" class="request-list__row">
          <div class="request-list__main">
            <span class="request-list__title">
              {{ formatIsoDate(request.recordDate) }} · {{ correctionKindShortLabel(request.kind) }}
            </span>
            <span class="request-list__reason type-meta">{{ request.reason }}</span>
            <span class="type-meta">
              {{ $t("student.attendance.sent", { time: formatRelativeTime(request.createdAt) }) }}
            </span>
          </div>
          <BaseButton
            :label="$t('student.attendance.withdraw')"
            severity="secondary"
            text
            size="small"
            :loading="correctionsStore.saving"
            @click="correctionsStore.withdraw(request.id)"
          />
        </li>
      </ul>
    </BaseCard>

    <BaseCard
      v-if="resolvedRequests.length"
      :title="$t('student.attendance.answeredTitle')"
      :description="$t('student.attendance.answeredDescription')"
    >
      <ul class="request-list">
        <li v-for="request in resolvedRequests" :key="request.id" class="request-list__row">
          <div class="request-list__main">
            <span class="request-list__title">
              {{ formatIsoDate(request.recordDate) }} · {{ correctionKindShortLabel(request.kind) }}
            </span>
            <span class="request-list__reason type-meta">
              {{
                request.resolutionNote ||
                (request.appliedToRecord
                  ? $t("student.attendance.recordCorrected")
                  : $t("student.attendance.noNote"))
              }}
            </span>
            <span class="type-meta">
              {{ request.resolvedBy }} · {{ formatRelativeTime(request.resolvedAt) }}
              <template v-if="request.appliedToRecord"> · {{ $t("student.attendance.recordUpdated") }}</template>
            </span>
          </div>
          <BaseStatusPill
            :label="correctionStatusLabel(request.status)"
            :tone="request.status === 'approved' ? 'success' : 'warning'"
          />
        </li>
      </ul>
    </BaseCard>

    <BaseLoading v-if="attendanceStore.loading && records.length === 0" />

    <BaseCard
      v-else
      :title="$t('student.attendance.recordTitle')"
      :description="
        $t(
          'student.attendance.recordDescription',
          {
            days: daysInView,
            hours: $t('common.time.hoursShort', { count: totalHours }),
            scope:
              monthFilter === 'all'
                ? $t('student.attendance.scopeAll')
                : $t('student.attendance.scopeMonth'),
          },
          daysInView,
        )
      "
    >
      <BaseEmptyState
        v-if="records.length === 0 && !attendanceStore.errorMessage"
        :title="$t('student.attendance.emptyTitle')"
        :description="
          monthFilter === 'all'
            ? $t('student.attendance.emptyAll')
            : $t('student.attendance.emptyMonth')
        "
      />

      <ul v-else class="day-list">
        <li v-for="record in records" :key="record.id" class="day-list__row">
          <div class="day-list__when">
            <span class="day-list__date">{{ formatIsoDate(record.date) }}</span>
            <span class="type-meta">{{ record.deviceName }}</span>
          </div>

          <div class="day-list__times">
            <span class="type-numeric">{{ record.entry ?? '—' }} – {{ record.exit ?? '—' }}</span>
            <span class="type-meta">{{ $t("common.time.hoursShort", { count: record.hours ?? 0 }) }}</span>
          </div>

          <BaseStatusPill :label="attendanceStatusLabel(record.status)" :tone="statusTone(record.status)" />

          <div class="day-list__action">
            <span v-if="!correctionsStore.canRequestFor(record.id)" class="day-list__pending type-meta">
              <PhClockCounterClockwise weight="regular" />
              {{ $t("student.attendance.reported") }}
            </span>
            <BaseButton
              v-else
              :label="$t('student.attendance.reportProblem')"
              severity="secondary"
              text
              size="small"
              @click="openDialog(record)"
            />
          </div>
        </li>
      </ul>

      <template #footer>
        <p class="type-meta footer-note">
          <PhWarningCircle weight="regular" />
          {{ $t("student.attendance.footerNote") }}
        </p>
      </template>
    </BaseCard>

    <CorrectionRequestDialog
      :visible="dialogRecord !== null"
      :record="dialogRecord"
      :loading="correctionsStore.saving"
      :error-message="correctionsStore.errorMessage"
      @update:visible="dialogRecord = $event ? dialogRecord : null"
      @submit="submitRequest"
    />
  </section>
</template>

<style scoped>
.request-list,
.day-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.request-list__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.request-list__row:not(:last-child),
.day-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.request-list__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.request-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.request-list__reason {
  color: var(--foreground-secondary);
}

.day-list__row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto minmax(140px, auto);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.day-list__when,
.day-list__times {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.day-list__date {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.day-list__action {
  justify-self: end;
}

.day-list__pending {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.day-list__pending svg,
.footer-note svg {
  width: 14px;
  height: 14px;
}

.footer-note {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
}

@media (max-width: 820px) {
  .day-list__row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: var(--space-2);
  }

  .day-list__action {
    grid-column: 1 / -1;
    justify-self: start;
  }
}
</style>
