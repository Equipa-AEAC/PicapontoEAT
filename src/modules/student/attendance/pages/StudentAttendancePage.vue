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
  BaseStatusPill,
} from "../../../../shared/components/base";
import CorrectionRequestDialog from "../../../../components/attendance/CorrectionRequestDialog.vue";
import { useAttendanceCorrectionsStore, useAttendanceStore } from "../../../../shared/stores";
import type { AttendanceSummary, CorrectionRequestFormValues } from "../../../../shared/types";
import { CORRECTION_KIND_SHORT, CORRECTION_STATUS_LABELS } from "../../../../shared/types";
import { formatIsoDate, formatRelativeTime } from "../../../../shared/utils/date";
import { useAuthStore } from "../../../../modules/authentication";

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
  await Promise.all([attendanceStore.loadAttendance(), correctionsStore.loadMyRequests()]);
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
    { label: "All months", value: "all" },
    ...[...months].sort().reverse().map((value) => ({ label: value, value })),
  ];
});

const totalHours = computed(() =>
  Math.round(records.value.reduce((total, row) => total + (row.hours ?? 0), 0) * 10) / 10,
);

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
      title="Attendance"
      description="Every day recorded against your card. If something is wrong, say so here."
    >
      <template #actions>
        <BaseSelect
          :model-value="monthFilter"
          :options="monthOptions"
          @update:model-value="monthFilter = $event as string"
        />
        <BaseButton label="Refresh" severity="secondary" outlined :loading="attendanceStore.loading" @click="load" />
      </template>
    </BasePageHeader>

    <p v-if="correctionsStore.successMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ correctionsStore.successMessage }}
    </p>

    <p v-if="attendanceStore.errorMessage" class="form-error-banner">{{ attendanceStore.errorMessage }}</p>
    <p v-if="correctionsStore.errorMessage" class="form-error-banner">{{ correctionsStore.errorMessage }}</p>

    <!-- Anything the member has already raised comes before the list itself. -->
    <BaseCard
      v-if="openRequests.length"
      title="Waiting for review"
      description="You have asked about these days. Nobody has answered yet."
    >
      <ul class="request-list">
        <li v-for="request in openRequests" :key="request.id" class="request-list__row">
          <div class="request-list__main">
            <span class="request-list__title">
              {{ formatIsoDate(request.recordDate) }} · {{ CORRECTION_KIND_SHORT[request.kind] }}
            </span>
            <span class="request-list__reason type-meta">{{ request.reason }}</span>
            <span class="type-meta">Sent {{ formatRelativeTime(request.createdAt) }}</span>
          </div>
          <BaseButton
            label="Withdraw"
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
      title="Answered"
      description="What the coordination team decided about the days you reported."
    >
      <ul class="request-list">
        <li v-for="request in resolvedRequests" :key="request.id" class="request-list__row">
          <div class="request-list__main">
            <span class="request-list__title">
              {{ formatIsoDate(request.recordDate) }} · {{ CORRECTION_KIND_SHORT[request.kind] }}
            </span>
            <span class="request-list__reason type-meta">
              {{ request.resolutionNote || (request.appliedToRecord ? 'The record was corrected.' : 'No note was left.') }}
            </span>
            <span class="type-meta">
              {{ request.resolvedBy }} · {{ formatRelativeTime(request.resolvedAt) }}
              <template v-if="request.appliedToRecord"> · record updated</template>
            </span>
          </div>
          <BaseStatusPill
            :label="CORRECTION_STATUS_LABELS[request.status]"
            :tone="request.status === 'approved' ? 'success' : 'warning'"
          />
        </li>
      </ul>
    </BaseCard>

    <BaseLoading v-if="attendanceStore.loading && records.length === 0" />

    <BaseCard v-else title="Your record" :description="`${records.length} ${records.length === 1 ? 'day' : 'days'} · ${totalHours}h logged`">
      <BaseEmptyState
        v-if="records.length === 0 && !attendanceStore.errorMessage"
        title="Nothing recorded yet"
        :description="
          monthFilter === 'all'
            ? 'Your check-ins appear here once you scan your card at a terminal.'
            : 'No days were recorded in the month you picked.'
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
            <span class="type-meta">{{ record.hours ?? 0 }}h</span>
          </div>

          <BaseStatusPill :label="record.status" :tone="statusTone(record.status)" />

          <div class="day-list__action">
            <span v-if="!correctionsStore.canRequestFor(record.id)" class="day-list__pending type-meta">
              <PhClockCounterClockwise weight="regular" />
              Reported
            </span>
            <BaseButton
              v-else
              label="Report a problem"
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
          Reporting a day sends it to the coordination team. Only they can change an attendance record.
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
