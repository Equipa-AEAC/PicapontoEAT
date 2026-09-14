<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { PhCalendarPlus, PhNotePencil, PhPencilSimple, PhTrash } from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BasePageHeader,
  BaseStatusPill,
} from "../../../../shared/components/base";
import CalendarMonthGrid from "../../../../components/calendar/CalendarMonthGrid.vue";
import type { CalendarDayInfo } from "../../../../components/calendar/CalendarMonthGrid.vue";
import CalendarEventDialog from "../../../../components/calendar/CalendarEventDialog.vue";
import {
  useAttendanceStore,
  useCalendarEventsStore,
  useInternshipReportsStore,
  useProjectsStore,
} from "../../../../shared/stores";
import type { AttendanceStatus, CalendarEvent, CalendarEventFormValues } from "../../../../shared/types";
import { CALENDAR_CATEGORY_TONES } from "../../../../shared/types";
import { useAuthStore } from "../../../../modules/authentication";
import { formatIsoDate, todayIsoDate } from "../../../../shared/utils/date";
import { t } from "../../../../i18n";
import {
  ATTENDANCE_STATUS_ORDER,
  attendanceStatusLabel,
  calendarCategoryLabel,
  calendarVisibilityLabel,
  dailyLogStatusLabel,
} from "../../../../i18n/vocabulary";

/**
 * The member's month, and what one day of it actually contained.
 *
 * The page used to be a month of attendance tiles whose only interaction sent
 * you to the attendance list — the same list, unfiltered, with the day you
 * clicked nowhere in sight. Clicking a day now answers the three questions a
 * calendar is asked: what happened, what is coming, and what can I do about it.
 *
 * The day panel is deliberately a panel and not a dialog. A calendar is read by
 * moving between days, and a modal that has to be dismissed before the next
 * click turns that into a sequence of interruptions.
 */
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const attendanceStore = useAttendanceStore();
const eventsStore = useCalendarEventsStore();
const projectsStore = useProjectsStore();
const reportsStore = useInternshipReportsStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization — see the note on
 * `authStore.currentMemberId`.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

const today = todayIsoDate();

/**
 * Open on the day the caller asked for.
 *
 * The dashboard's month grid and every "see it on the calendar" link pass
 * `?date=`; landing on today instead would drop the one piece of context the
 * reader clicked to keep.
 */
const requestedDate = typeof route.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date)
  ? route.query.date
  : null;

const viewMonth = ref((requestedDate ?? today).slice(0, 7));
const selectedDate = ref<string | null>(requestedDate ?? today);

const eventDialogVisible = ref(false);
const editingEvent = ref<CalendarEvent | null>(null);
const deleteConfirmVisible = ref(false);
const pendingDeleteId = ref<string | null>(null);

const STATUS_TONES: Record<AttendanceStatus, "success" | "warning" | "danger" | "info"> = {
  present: "success",
  late: "warning",
  missing: "danger",
  corrected: "info",
};

/** The signed-in member, as an event author. */
const author = computed(() => ({
  id: memberId.value,
  name: authStore.currentUser?.fullName ?? "Member",
}));

const attendanceRows = computed(() =>
  attendanceStore.items.filter((row) => row.studentId === memberId.value),
);

const attendanceByDate = computed(() => {
  const map = new Map<string, (typeof attendanceRows.value)[number]>();

  for (const row of attendanceRows.value) {
    map.set(row.date, row);
  }

  return map;
});

/** Tasks with a due date, keyed by that date. */
const tasksByDate = computed(() => {
  const map = new Map<string, typeof projectsStore.memberProjectTasks>();

  for (const task of projectsStore.memberProjectTasks) {
    if (!task.dueDate) {
      continue;
    }

    const bucket = map.get(task.dueDate) ?? [];
    bucket.push(task);
    map.set(task.dueDate, bucket);
  }

  return map;
});

/** Everything the grid needs, assembled once per month rather than per cell. */
const dayInfo = computed(() => {
  const info: Record<string, CalendarDayInfo> = {};

  function ensure(date: string): CalendarDayInfo {
    info[date] ??= { status: null, statusLabel: "", hours: null, eventCount: 0, taskCount: 0 };
    return info[date];
  }

  for (const row of attendanceRows.value) {
    if (!row.date.startsWith(viewMonth.value)) continue;
    const day = ensure(row.date);
    day.status = row.status;
    day.statusLabel = attendanceStatusLabel(row.status);
    day.hours = row.hours;
  }

  for (const event of eventsStore.items) {
    if (!event.date.startsWith(viewMonth.value)) continue;
    ensure(event.date).eventCount += 1;
  }

  for (const [date, tasks] of tasksByDate.value) {
    if (!date.startsWith(viewMonth.value)) continue;
    ensure(date).taskCount += tasks.length;
  }

  return info;
});

const monthHours = computed(
  () =>
    Math.round(
      attendanceRows.value
        .filter((row) => row.date.startsWith(viewMonth.value))
        .reduce((total, row) => total + (row.hours ?? 0), 0) * 10,
    ) / 10,
);

const monthSummary = computed(() => {
  const days = attendanceRows.value.filter((row) => row.date.startsWith(viewMonth.value)).length;
  const events = eventsStore.items.filter((event) => event.date.startsWith(viewMonth.value)).length;

  return t(
    "student.calendar.summary",
    { days, hours: t("common.time.hoursShort", { count: monthHours.value }), events },
    days,
  );
});

/* ------------------------------------------------------------ Selected day */

const selectedAttendance = computed(() =>
  selectedDate.value ? attendanceByDate.value.get(selectedDate.value) ?? null : null,
);

const selectedEvents = computed(() =>
  selectedDate.value ? eventsStore.eventsOn(selectedDate.value) : [],
);

const selectedTasks = computed(() =>
  selectedDate.value ? tasksByDate.value.get(selectedDate.value) ?? [] : [],
);

/** The journal entry written for the selected day, if there is one. */
const selectedJournalEntry = computed(() =>
  reportsStore.dailyLogs.find((entry) => entry.date === selectedDate.value) ?? null,
);

const selectedIsFuture = computed(() => (selectedDate.value ?? "") > today);

/**
 * Whether the day is worth writing a report about.
 *
 * A daily report describes work that happened, so the action is offered for days
 * that are done and have something recorded against them — not for a future date
 * and not for a day the member was not here.
 */
const canWriteReport = computed(
  () => !selectedIsFuture.value && (selectedAttendance.value?.hours ?? 0) > 0,
);

const selectedLabel = computed(() => (selectedDate.value ? formatIsoDate(selectedDate.value) : ""));

/* ------------------------------------------------------------- Interaction */

function selectDay(date: string) {
  selectedDate.value = date;
}

function changeMonth(month: string) {
  viewMonth.value = month;
}

/**
 * A deadline on the calendar leads to the board it belongs to.
 *
 * The calendar showed task deadlines and stopped there, so the one thing a
 * reader wants after seeing "this is due today" — the task itself — took a trip
 * through Projects and a hunt for the card. It now opens that project's board
 * directly, which is where the task can actually be moved.
 */
function openTaskBoard(projectId: string) {
  void router.push({ name: "student-project-detail", params: { projectId } });
}

function openDailyLog() {
  void router.push({ name: "student-daily-log", query: { date: selectedDate.value ?? undefined } });
}

function openAttendance() {
  void router.push({ name: "student-attendance" });
}

function openEventDialog(event: CalendarEvent | null = null) {
  eventsStore.errorMessage = null;
  editingEvent.value = event;
  eventDialogVisible.value = true;
}

async function reloadEvents() {
  await eventsStore.loadForMember(memberId.value);
}

async function saveEvent(values: CalendarEventFormValues) {
  const saved = await eventsStore.save(values, author.value, reloadEvents, editingEvent.value?.id);

  if (saved) {
    eventDialogVisible.value = false;
    editingEvent.value = null;
    // Follow the event: saving a date other than the open one should show it.
    selectedDate.value = values.date;
    viewMonth.value = values.date.slice(0, 7);
  }
}

function requestDelete(eventId: string) {
  pendingDeleteId.value = eventId;
  deleteConfirmVisible.value = true;
}

async function confirmDelete() {
  if (pendingDeleteId.value) {
    await eventsStore.remove(pendingDeleteId.value, author.value, reloadEvents);
  }

  pendingDeleteId.value = null;
  deleteConfirmVisible.value = false;
}

function isMine(event: CalendarEvent) {
  return event.authorId === memberId.value;
}

const projectOptions = computed(() =>
  projectsStore.memberProjects.map((project) => ({ label: project.name, value: project.id })),
);

async function load() {
  attendanceStore.filters.studentId = memberId.value;

  await Promise.all([
    attendanceStore.loadAttendance(),
    eventsStore.loadForMember(memberId.value),
    projectsStore.loadMemberWorkspace(memberId.value),
    reportsStore.loadJournal(memberId.value),
  ]);
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('student.calendar.title')"
      :description="$t('student.calendar.description')"
    >
      <template #actions>
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="attendanceStore.loading"
          @click="load"
        />
        <BaseButton @click="openEventDialog()">
          <PhCalendarPlus weight="bold" />
          {{ $t("student.calendar.addEvent") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState v-if="attendanceStore.errorMessage" :message="attendanceStore.errorMessage" @retry="load" />
    <p v-if="eventsStore.errorMessage && !eventDialogVisible" class="form-error-banner">{{ eventsStore.errorMessage }}</p>

    <BaseLoading v-if="attendanceStore.loading && attendanceRows.length === 0" />

    <div v-else class="calendar-layout">
      <BaseCard>
        <CalendarMonthGrid
          :month="viewMonth"
          :selected="selectedDate"
          :days="dayInfo"
          :summary="monthSummary"
          @update:month="changeMonth"
          @select="selectDay"
        />

        <template #footer>
          <ul class="month-legend">
            <li v-for="status in ATTENDANCE_STATUS_ORDER" :key="status" class="month-legend__item">
              <span class="month-legend__swatch" :class="`attendance-calendar__day--${status}`" />
              <span class="type-meta">{{ attendanceStatusLabel(status) }}</span>
            </li>
            <li class="month-legend__item">
              <span class="month-legend__mark month-legend__mark--event">1</span>
              <span class="type-meta">{{ $t("student.calendar.legendEvents") }}</span>
            </li>
            <li class="month-legend__item">
              <span class="month-legend__mark month-legend__mark--task">1</span>
              <span class="type-meta">{{ $t("student.calendar.legendTasks") }}</span>
            </li>
          </ul>
        </template>
      </BaseCard>

      <!-- ------------------------------------------------------- Day panel -->
      <BaseCard
        class="day-panel"
        :title="selectedLabel || $t('student.calendar.pickDay')"
        :description="
          selectedDate
            ? $t('student.calendar.dayDescription')
            : $t('student.calendar.pickDayDescription')
        "
      >
        <BaseEmptyState
          v-if="!selectedDate"
          :title="$t('student.calendar.noDayTitle')"
          :description="$t('student.calendar.noDayDescription')"
        />

        <template v-else>
          <!-- Attendance first: it is the only thing here that counts towards hours. -->
          <section class="day-block">
            <p class="type-eyebrow day-block__title">{{ $t("student.calendar.attendance") }}</p>

            <div v-if="selectedAttendance" class="day-attendance">
              <BaseStatusPill
                :label="attendanceStatusLabel(selectedAttendance.status)"
                :tone="STATUS_TONES[selectedAttendance.status]"
              />
              <p class="type-numeric day-attendance__times">
                {{ selectedAttendance.entry ?? '—' }} – {{ selectedAttendance.exit ?? '—' }}
                <span class="type-meta">
                  · {{ $t("common.time.hoursShort", { count: selectedAttendance.hours ?? 0 }) }}
                </span>
              </p>
              <p class="type-meta">{{ selectedAttendance.deviceName }}</p>
              <BaseButton
                :label="$t('student.calendar.openAttendance')"
                severity="secondary"
                text
                size="small"
                @click="openAttendance"
              />
            </div>

            <p v-else class="type-meta day-block__empty">
              {{ selectedIsFuture ? $t("student.calendar.futureDay") : $t("student.calendar.noScan") }}
            </p>
          </section>

          <!-- The daily report, reachable from the day it describes. -->
          <section class="day-block">
            <p class="type-eyebrow day-block__title">{{ $t("student.calendar.dailyReport") }}</p>

            <div v-if="selectedJournalEntry" class="day-report">
              <BaseBadge
                :label="dailyLogStatusLabel(selectedJournalEntry.status)"
                :tone="selectedJournalEntry.status === 'submitted' ? 'success' : 'warning'"
              />
              <p class="day-report__text">{{ selectedJournalEntry.activities }}</p>
              <BaseButton
                :label="
                  selectedJournalEntry.status === 'draft'
                    ? $t('student.calendar.openDraft')
                    : $t('student.calendar.openInDailyReport')
                "
                severity="secondary"
                text
                size="small"
                @click="openDailyLog"
              />
            </div>

            <template v-else>
              <p class="type-meta day-block__empty">
                {{
                  canWriteReport
                    ? $t("student.calendar.noEntry")
                    : selectedIsFuture
                      ? $t("student.calendar.entryLater")
                      : $t("student.calendar.nothingToReport")
                }}
              </p>
              <BaseButton v-if="canWriteReport" severity="secondary" outlined size="small" @click="openDailyLog">
                <PhNotePencil weight="bold" />
                {{ $t("student.calendar.writeEntry") }}
              </BaseButton>
            </template>
          </section>

          <!-- Work due on the day, so a deadline is visible where it falls. -->
          <section v-if="selectedTasks.length" class="day-block">
            <p class="type-eyebrow day-block__title">{{ $t("student.calendar.dueToday") }}</p>
            <ul class="day-list">
              <li v-for="task in selectedTasks" :key="task.id" class="day-list__row">
                <button type="button" class="day-list__main day-list__link" @click="openTaskBoard(task.projectId)">
                  <span class="day-list__title">{{ task.title }}</span>
                  <span class="type-meta">
                    {{ $t("student.calendar.openBoard", { project: task.projectName }) }}
                  </span>
                </button>
                <BaseBadge
                  :label="task.isOverdue ? $t('common.time.overdue') : $t('common.time.due')"
                  :tone="task.isOverdue ? 'danger' : 'warning'"
                />
              </li>
            </ul>
          </section>

          <section class="day-block">
            <p class="type-eyebrow day-block__title">{{ $t("student.calendar.events") }}</p>

            <ul v-if="selectedEvents.length" class="day-list">
              <li v-for="event in selectedEvents" :key="event.id" class="day-list__row">
                <div class="day-list__main">
                  <span class="day-list__title">{{ event.title }}</span>
                  <span class="type-meta">
                    <template v-if="event.startTime">{{ event.startTime }}<template v-if="event.endTime">–{{ event.endTime }}</template> · </template>
                    {{ calendarVisibilityLabel(event.visibility) }}
                    <template v-if="!isMine(event)"> · {{ event.authorName }}</template>
                  </span>
                  <span v-if="event.description" class="type-meta day-list__note">{{ event.description }}</span>
                </div>

                <div class="day-list__actions">
                  <BaseBadge
                    :label="calendarCategoryLabel(event.category)"
                    :tone="CALENDAR_CATEGORY_TONES[event.category]"
                  />
                  <!-- Only the author edits. Everyone else is reading somebody's plan. -->
                  <template v-if="isMine(event)">
                    <BaseButton severity="secondary" text size="small" :aria-label="$t('student.calendar.editEvent')" @click="openEventDialog(event)">
                      <PhPencilSimple weight="bold" />
                    </BaseButton>
                    <BaseButton severity="danger" text size="small" :aria-label="$t('student.calendar.removeEvent')" @click="requestDelete(event.id)">
                      <PhTrash weight="bold" />
                    </BaseButton>
                  </template>
                </div>
              </li>
            </ul>

            <p v-else class="type-meta day-block__empty">{{ $t("student.calendar.nothingPlanned") }}</p>

            <BaseButton severity="secondary" outlined size="small" @click="openEventDialog()">
              <PhCalendarPlus weight="bold" />
              {{ $t("student.calendar.addEventOnDay") }}
            </BaseButton>
          </section>
        </template>
      </BaseCard>
    </div>

    <CalendarEventDialog
      :visible="eventDialogVisible"
      :event="editingEvent"
      :default-date="selectedDate ?? today"
      :project-options="projectOptions"
      :busy="eventsStore.saving"
      :error-message="eventsStore.errorMessage"
      @update:visible="eventDialogVisible = $event"
      @save="saveEvent"
      @cancel="eventDialogVisible = false"
    />

    <BaseConfirmDialog
      :visible="deleteConfirmVisible"
      :title="$t('student.calendar.removeEventTitle')"
      :message="$t('student.calendar.removeEventMessage')"
      :confirm-label="$t('student.calendar.removeEvent')"
      :cancel-label="$t('common.actions.cancel')"
      severity="danger"
      @update:visible="deleteConfirmVisible = $event"
      @confirm="confirmDelete"
      @cancel="deleteConfirmVisible = false"
    />
  </section>
</template>

<style scoped>
/*
 * Two columns on a desktop: the month keeps its size while the day panel reads
 * beside it, so selecting a day never pushes the calendar off screen.
 */
.calendar-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: var(--space-4);
  align-items: start;
}

.day-panel {
  position: sticky;
  top: var(--space-4);
}

.day-block:not(:first-child) {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: var(--border-width) solid var(--border-subtle);
}

.day-block__title {
  margin: 0 0 var(--space-2);
  color: var(--foreground-secondary);
}

.day-block__empty {
  margin: 0 0 var(--space-2);
}

.day-attendance,
.day-report {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.day-attendance__times,
.day-report__text {
  margin: 0;
  font-size: var(--text-sm);
}

.day-list {
  margin: 0 0 var(--space-3);
  padding: 0;
  list-style: none;
}

.day-list__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.day-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.day-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.day-list__link {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.day-list__link:hover .day-list__title {
  color: var(--primary);
}

.day-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.day-list__note {
  color: var(--foreground-secondary);
}

.day-list__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex: none;
}

.month-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
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

.month-legend__mark {
  min-width: 16px;
  padding: 0 4px;
  border-radius: var(--radius-sm);
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  text-align: center;
}

.month-legend__mark--event {
  background: var(--primary-subtle);
  color: var(--primary-contrast);
}

.month-legend__mark--task {
  background: var(--secondary-subtle);
  color: var(--foreground-secondary);
}

@media (max-width: 1080px) {
  .calendar-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .day-panel {
    position: static;
  }
}
</style>
