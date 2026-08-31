<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { PhCaretLeft, PhCaretRight } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseDataCard,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BasePageHeader,
  BaseSection,
} from "../../../../shared/components/base";
import { useAttendanceStore } from "../../../../shared/stores";
import type { AttendanceStatus } from "../../../../shared/types";
import { useAuthStore } from "../../../../modules/authentication";
import { formatIsoDate, todayIsoDate } from "../../../../shared/utils/date";

/**
 * The member's attendance as a month.
 *
 * This page used to render `portalSummary.attendanceCalendar` — seven fixed
 * dates in July with statuses (`absent`, `holiday`) that are not in
 * `AttendanceStatus` at all. It was a third hand-maintained copy of days the
 * attendance collection already holds, so it could not show a real month, and a
 * correction applied to a record never reached it.
 *
 * It now projects the same rows the attendance page reads, which is what makes
 * a corrected day show as corrected here too.
 */
const authStore = useAuthStore();
const attendanceStore = useAttendanceStore();
const router = useRouter();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization — see the note on
 * `authStore.currentMemberId`.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

/** `YYYY-MM` of the month on screen. */
const viewMonth = ref(todayIsoDate().slice(0, 7));

/** Monday first, the convention the school's own week uses. */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  missing: "Missing",
  corrected: "Corrected",
};

const records = computed(() => attendanceStore.items.filter((row) => row.studentId === memberId.value));

/** Months this member actually has records in, newest first. */
const monthsWithData = computed(() =>
  [...new Set(records.value.map((row) => row.date.slice(0, 7)))].sort().reverse(),
);

const monthRecords = computed(() => records.value.filter((row) => row.date.startsWith(viewMonth.value)));

/** `2026-08` keyed by day-of-month, so a cell is one lookup. */
const byDay = computed(() => {
  const map = new Map<number, (typeof monthRecords.value)[number]>();

  for (const row of monthRecords.value) {
    map.set(Number(row.date.slice(8, 10)), row);
  }

  return map;
});

const monthLabel = computed(() => {
  const [year, month] = viewMonth.value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
});

/**
 * The grid cells: leading blanks so the 1st lands under its weekday, then the
 * days themselves. Built from a local `Date` rather than parsing the ISO string
 * as UTC, which would shift the whole month by a day in a negative offset.
 */
const cells = computed(() => {
  const [year, month] = viewMonth.value.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  // getDay() is Sunday-first; shift so Monday is 0.
  const leading = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const blanks = Array.from({ length: leading }, (_, index) => ({ key: `blank-${index}`, day: null }));
  const days = Array.from({ length: daysInMonth }, (_, index) => ({
    key: `${viewMonth.value}-${index + 1}`,
    day: index + 1,
  }));

  return [...blanks, ...days];
});

const today = todayIsoDate();

function isoFor(day: number) {
  return `${viewMonth.value}-${String(day).padStart(2, "0")}`;
}

function shiftMonth(step: number) {
  const [year, month] = viewMonth.value.split("-").map(Number);
  const next = new Date(year, month - 1 + step, 1);

  viewMonth.value = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function countOf(status: AttendanceStatus) {
  return monthRecords.value.filter((row) => row.status === status).length;
}

const monthHours = computed(
  () => Math.round(monthRecords.value.reduce((total, row) => total + (row.hours ?? 0), 0) * 10) / 10,
);

/** A day with a record leads to the page that can act on it. */
function openDay(day: number) {
  if (!byDay.value.has(day)) {
    return;
  }

  void router.push({ name: "student-attendance" });
}

async function load() {
  attendanceStore.filters.studentId = memberId.value;
  await attendanceStore.loadAttendance();

  // Open on the newest month that has anything in it, rather than an empty grid.
  if (!monthsWithData.value.includes(viewMonth.value) && monthsWithData.value.length > 0) {
    viewMonth.value = monthsWithData.value[0];
  }
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Calendar"
      description="Your attendance month by month. The same records the attendance page shows, including corrections."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="attendanceStore.loading" @click="load" />
        <BaseButton label="Attendance" severity="secondary" outlined @click="router.push({ name: 'student-attendance' })" />
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="attendanceStore.errorMessage"
      :message="attendanceStore.errorMessage"
      @retry="load"
    />

    <section class="metric-grid">
      <BaseDataCard title="Present" :value="String(countOf('present'))" :description="`Days marked present in ${monthLabel}`" />
      <BaseDataCard title="Late" :value="String(countOf('late'))" :description="`Days you arrived late in ${monthLabel}`" />
      <BaseDataCard title="Corrected" :value="String(countOf('corrected'))" :description="`Days changed after review in ${monthLabel}`" />
      <BaseDataCard title="Missing" :value="String(countOf('missing'))" :description="`Days with no usable scan in ${monthLabel}`" />
    </section>

    <BaseLoading v-if="attendanceStore.loading && records.length === 0" />

    <BaseSection v-else title="Attendance calendar" description="One tile per day. Days you were not scheduled stay blank.">
      <BaseCard>
        <header class="month-bar">
          <BaseButton severity="secondary" text aria-label="Previous month" @click="shiftMonth(-1)">
            <PhCaretLeft weight="bold" />
          </BaseButton>
          <h3 class="month-bar__label">{{ monthLabel }}</h3>
          <BaseButton severity="secondary" text aria-label="Next month" @click="shiftMonth(1)">
            <PhCaretRight weight="bold" />
          </BaseButton>
          <span class="month-bar__hours type-meta">{{ monthHours }}h logged</span>
        </header>

        <BaseEmptyState
          v-if="monthRecords.length === 0"
          title="Nothing recorded this month"
          :description="
            monthsWithData.length > 0
              ? 'Use the arrows to move to a month with attendance in it.'
              : 'Once you start scanning your card, each day appears here with its status.'
          "
        />

        <template v-else>
          <div class="month-grid" role="grid" :aria-label="`Attendance for ${monthLabel}`">
            <span v-for="weekday in WEEKDAYS" :key="weekday" class="month-grid__weekday type-label">
              {{ weekday }}
            </span>

            <template v-for="cell in cells" :key="cell.key">
              <span v-if="cell.day === null" class="month-grid__blank" aria-hidden="true" />

              <component
                :is="byDay.has(cell.day) ? 'button' : 'div'"
                v-else
                :type="byDay.has(cell.day) ? 'button' : undefined"
                class="month-grid__day"
                :class="[
                  byDay.get(cell.day) ? `attendance-calendar__day--${byDay.get(cell.day)!.status}` : 'month-grid__day--none',
                  { 'month-grid__day--today': isoFor(cell.day) === today },
                ]"
                :aria-label="
                  byDay.has(cell.day)
                    ? `${formatIsoDate(isoFor(cell.day))} — ${STATUS_LABELS[byDay.get(cell.day)!.status]}`
                    : `${formatIsoDate(isoFor(cell.day))} — no record`
                "
                @click="openDay(cell.day)"
              >
                <span class="month-grid__number">{{ cell.day }}</span>
                <span v-if="byDay.get(cell.day)" class="month-grid__status type-meta">
                  {{ STATUS_LABELS[byDay.get(cell.day)!.status] }}
                </span>
                <span v-if="byDay.get(cell.day)?.hours" class="month-grid__hours type-meta">
                  {{ byDay.get(cell.day)!.hours }}h
                </span>
              </component>
            </template>
          </div>

          <ul class="month-legend">
            <li v-for="(label, status) in STATUS_LABELS" :key="status" class="month-legend__item">
              <span class="month-legend__swatch" :class="`attendance-calendar__day--${status}`" />
              <span class="type-meta">{{ label }}</span>
            </li>
          </ul>
        </template>
      </BaseCard>
    </BaseSection>
  </section>
</template>

<style scoped>
.month-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.month-bar__label {
  margin: 0;
  min-width: 12ch;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  text-align: center;
  text-transform: capitalize;
}

.month-bar__hours {
  margin-left: auto;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--space-2);
}

.month-grid__weekday {
  padding-bottom: var(--space-1);
  text-align: center;
}

.month-grid__blank {
  /* Holds a column so the 1st lands under the right weekday. */
  min-height: 0;
}

.month-grid__day {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 72px;
  padding: var(--space-2);
  border: var(--border-width) solid var(--border);
  border-left-width: 3px;
  border-radius: var(--radius-md);
  background: var(--surface);
  font: inherit;
  text-align: left;
  color: var(--foreground);
}

button.month-grid__day {
  cursor: pointer;
}

button.month-grid__day:hover {
  border-color: var(--primary);
}

/* A day with no record is a fact, not a failure — it recedes rather than alarms. */
.month-grid__day--none {
  border-left-color: var(--border);
  background: transparent;
  color: var(--foreground-muted);
}

.month-grid__day--today {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}

.month-grid__number {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  font-variant-numeric: tabular-nums;
}

.month-grid__status,
.month-grid__hours {
  line-height: var(--leading-tight);
}

.month-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
}

.month-legend__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.month-legend__swatch {
  width: 12px;
  height: 12px;
  border: var(--border-width) solid var(--border);
  border-left-width: 3px;
  border-radius: var(--radius-sm);
}

@media (max-width: 640px) {
  .month-grid__day {
    min-height: 56px;
    padding: var(--space-1);
  }

  .month-grid__status {
    display: none;
  }
}
</style>
