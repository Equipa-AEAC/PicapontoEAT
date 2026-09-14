<script setup lang="ts">
import { computed } from "vue";
import { PhCaretLeft, PhCaretRight } from "@phosphor-icons/vue";

import BaseButton from "../base/BaseButton.vue";
import { currentLocaleTag, t } from "../../i18n";
import { formatIsoDate, todayIsoDate, weekdayNames } from "../../utils/date";

/**
 * What a calendar cell has to say about one day.
 *
 * The grid owns the geometry — which weekday the 1st falls on, how many rows a
 * month needs, where today is — and knows nothing about attendance, events or
 * tasks. Callers describe their days and the grid draws them, which is what lets
 * the student and admin calendars share one implementation instead of keeping
 * two month grids in step.
 */
export interface CalendarDayInfo {
  /** Attendance status for the day, used for the colour rail. Null for none. */
  status: string | null;
  statusLabel: string;
  hours: number | null;
  eventCount: number;
  taskCount: number;
}

const props = withDefaults(
  defineProps<{
    /** `YYYY-MM` of the month on screen. */
    month: string;
    /** `YYYY-MM-DD`, or null when nothing is open. */
    selected: string | null;
    /** Keyed by `YYYY-MM-DD`. Days with nothing to say may be omitted. */
    days: Record<string, CalendarDayInfo>;
    /** Rendered on the right of the month bar. */
    summary?: string;
  }>(),
  { summary: "" },
);

const emit = defineEmits<{
  "update:month": [month: string];
  select: [date: string];
}>();

/**
 * Monday first, the convention the school's own week uses.
 *
 * Built from `Intl` in the active language rather than written out, so the
 * header reads "Seg Ter Qua" in Portuguese instead of staying English inside an
 * otherwise translated card.
 */
const weekdays = computed(() => weekdayNames("short"));

const today = todayIsoDate();

const monthLabel = computed(() => {
  const [year, month] = props.month.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(currentLocaleTag(), { month: "long", year: "numeric" });
});

/**
 * Leading blanks so the 1st lands under its weekday, then the days themselves.
 * Built from a local `Date` rather than parsing the ISO string as UTC, which
 * would shift the whole month by a day in a negative offset.
 */
const cells = computed(() => {
  const [year, month] = props.month.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  // getDay() is Sunday-first; shift so Monday is 0.
  const leading = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  return [
    ...Array.from({ length: leading }, (_, index) => ({ key: `blank-${index}`, date: null as string | null })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = `${props.month}-${String(index + 1).padStart(2, "0")}`;
      return { key: date, date };
    }),
  ];
});

function infoFor(date: string): CalendarDayInfo | null {
  return props.days[date] ?? null;
}

function dayNumber(date: string): number {
  return Number(date.slice(8, 10));
}

function shiftMonth(step: number) {
  const [year, month] = props.month.split("-").map(Number);
  const next = new Date(year, month - 1 + step, 1);

  emit("update:month", `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
}

/** Every cell is a button: an empty day still answers "nothing happened here". */
function describe(date: string): string {
  const info = infoFor(date);
  const parts = [formatIsoDate(date)];

  if (info?.statusLabel) {
    parts.push(info.statusLabel);
  }

  if (info?.eventCount) {
    parts.push(`${info.eventCount} ${info.eventCount === 1 ? "event" : "events"}`);
  }

  if (info?.taskCount) {
    parts.push(`${info.taskCount} ${info.taskCount === 1 ? "task due" : "tasks due"}`);
  }

  return parts.length === 1
    ? t("components.calendarEvent.nothingRecordedSuffix", { summary: parts[0] })
    : parts.join(" — ");
}
</script>

<template>
  <div class="calendar-grid">
    <header class="month-bar">
      <BaseButton severity="secondary" text :aria-label="$t('common.actions.previous')" @click="shiftMonth(-1)">
        <PhCaretLeft weight="bold" />
      </BaseButton>
      <h3 class="month-bar__label">{{ monthLabel }}</h3>
      <BaseButton severity="secondary" text :aria-label="$t('common.actions.next')" @click="shiftMonth(1)">
        <PhCaretRight weight="bold" />
      </BaseButton>
      <span v-if="summary" class="month-bar__summary type-meta">{{ summary }}</span>
    </header>

    <div class="month-grid" role="grid" :aria-label="monthLabel">
      <span v-for="weekday in weekdays" :key="weekday" class="month-grid__weekday type-label">{{ weekday }}</span>

      <template v-for="cell in cells" :key="cell.key">
        <span v-if="cell.date === null" class="month-grid__blank" aria-hidden="true" />

        <button
          v-else
          type="button"
          class="month-grid__day"
          :class="[
            infoFor(cell.date)?.status
              ? `attendance-calendar__day--${infoFor(cell.date)!.status}`
              : 'month-grid__day--none',
            {
              'month-grid__day--today': cell.date === today,
              'month-grid__day--selected': cell.date === selected,
            },
          ]"
          :aria-label="describe(cell.date)"
          :aria-pressed="cell.date === selected"
          @click="emit('select', cell.date!)"
        >
          <span class="month-grid__number">{{ dayNumber(cell.date) }}</span>

          <span v-if="infoFor(cell.date)?.statusLabel" class="month-grid__status type-meta">
            {{ infoFor(cell.date)!.statusLabel }}
          </span>
          <span v-if="infoFor(cell.date)?.hours" class="month-grid__hours type-meta">
            {{ infoFor(cell.date)!.hours }}h
          </span>

          <span v-if="infoFor(cell.date)?.eventCount || infoFor(cell.date)?.taskCount" class="month-grid__marks">
            <span v-if="infoFor(cell.date)!.eventCount" class="month-grid__mark month-grid__mark--event">
              {{ infoFor(cell.date)!.eventCount }}
            </span>
            <span v-if="infoFor(cell.date)!.taskCount" class="month-grid__mark month-grid__mark--task">
              {{ infoFor(cell.date)!.taskCount }}
            </span>
          </span>
        </button>
      </template>
    </div>
  </div>
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
}

/*
 * `Intl` returns the month lower-cased in Portuguese ("setembro de 2026"), and
 * `text-transform: capitalize` capitalises *every* word — "Setembro De 2026".
 * Only the first letter is a sentence start, so only the first letter changes.
 */
.month-bar__label::first-letter {
  text-transform: uppercase;
}

.month-bar__summary {
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 78px;
  padding: var(--space-2);
  border: var(--border-width) solid var(--border);
  border-left-width: 3px;
  border-radius: var(--radius-md);
  background: var(--surface);
  font: inherit;
  text-align: left;
  color: var(--foreground);
  cursor: pointer;
}

.month-grid__day:hover {
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

.month-grid__day--selected {
  background: var(--selected);
  border-color: var(--primary);
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

.month-grid__marks {
  display: flex;
  gap: 4px;
  margin-top: auto;
}

.month-grid__mark {
  min-width: 16px;
  padding: 0 4px;
  border-radius: var(--radius-sm);
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.month-grid__mark--event {
  background: var(--primary-subtle);
  color: var(--primary-contrast);
}

.month-grid__mark--task {
  background: var(--secondary-subtle);
  color: var(--foreground-secondary);
}

@media (max-width: 640px) {
  .month-grid__day {
    min-height: 58px;
    padding: var(--space-1);
  }

  .month-grid__status {
    display: none;
  }
}
</style>
