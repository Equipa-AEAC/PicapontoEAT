<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { PhCalendarPlus, PhPencilSimple, PhTrash } from "@phosphor-icons/vue";

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseErrorState,
  BaseFilterPanel,
  BaseLoading,
  BasePageHeader,
  BaseSelect,
  BaseStatsCard,
  BaseStatusPill,
} from "../../../../shared/components/base";
import CalendarMonthGrid from "../../../../components/calendar/CalendarMonthGrid.vue";
import type { CalendarDayInfo } from "../../../../components/calendar/CalendarMonthGrid.vue";
import CalendarEventDialog from "../../../../components/calendar/CalendarEventDialog.vue";
import {
  useAttendanceStore,
  useAuthStore,
  useCalendarEventsStore,
  useMembersStore,
  useProjectsStore,
} from "../../../../shared/stores";
import type { CalendarEvent, CalendarEventFormValues } from "../../../../shared/types";
import { CALENDAR_CATEGORY_TONES } from "../../../../shared/types";
import { formatIsoDate, todayIsoDate } from "../../../../shared/utils/date";
import {
  attendanceStatusLabel,
  calendarCategoryLabel,
  calendarCategoryOptions,
  calendarVisibilityLabel,
  calendarVisibilityOptions,
} from "../../../../i18n/vocabulary";
import { t } from "../../../../i18n";

/**
 * The operational calendar.
 *
 * Deliberately not the student calendar with a wider query. A member opens their
 * calendar to answer "what did I do and what do I owe"; staff open this one to
 * answer "who was in, what is planned, and what falls due" — so the day panel
 * leads with roster-wide attendance rather than with one person's record, and
 * the filters are the ones an operational reader needs: whose events, which
 * project, what kind.
 *
 * Personal events are shown here and labelled as personal rather than hidden. An
 * operational calendar that silently omits rows is worse than one that shows
 * them and says whose they are; the label is what stops a private note being
 * read as a team commitment.
 *
 * BACKEND CONTRACT: staff-wide visibility is a presentation choice here. The API
 * must decide it from the caller's role rather than trusting the client to ask
 * for everything. See docs/ai/BACKEND_CONTRACTS.md.
 */
const router = useRouter();
const authStore = useAuthStore();
const eventsStore = useCalendarEventsStore();
const attendanceStore = useAttendanceStore();
const membersStore = useMembersStore();
const projectsStore = useProjectsStore();

const today = todayIsoDate();
const viewMonth = ref(today.slice(0, 7));
const selectedDate = ref<string | null>(today);

const eventDialogVisible = ref(false);
const editingEvent = ref<CalendarEvent | null>(null);
const deleteConfirmVisible = ref(false);
const pendingDeleteId = ref<string | null>(null);

/** The signed-in staff account, as an event author. */
const author = computed(() => ({
  id: authStore.currentUser?.id ?? "unknown",
  name: authStore.currentUser?.fullName ?? "Administrator",
}));

const visibilityOptions = [{ label: t("admin.calendar.allVisibilities"), value: "all" }, ...calendarVisibilityOptions()];
const categoryOptions = [{ label: t("admin.calendar.allTypes"), value: "all" }, ...calendarCategoryOptions()];

const projectFilterOptions = computed(() => [
  { label: t("common.filters.allProjects"), value: "all" },
  ...projectsStore.allProjects.map((project) => ({ label: project.name, value: project.id })),
]);

const authorFilterOptions = computed(() => [
  { label: t("admin.calendar.anyone"), value: "all" },
  ...[...new Map(eventsStore.items.map((event) => [event.authorId, event.authorName])).entries()].map(
    ([id, name]) => ({ label: name, value: id }),
  ),
]);

const projectOptions = computed(() =>
  projectsStore.allProjects.map((project) => ({ label: project.name, value: project.id })),
);

/* ------------------------------------------------------------ Attendance */

const monthAttendance = computed(() =>
  attendanceStore.items.filter((row) => row.date.startsWith(viewMonth.value)),
);

/** Attendance for the month, keyed by day, so a cell is one lookup. */
const attendanceByDate = computed(() => {
  const map = new Map<string, typeof attendanceStore.items>();

  for (const row of monthAttendance.value) {
    const bucket = map.get(row.date) ?? [];
    bucket.push(row);
    map.set(row.date, bucket);
  }

  return map;
});

const tasksByDate = computed(() => {
  const map = new Map<string, typeof projectsStore.tasks>();

  for (const task of projectsStore.tasks) {
    if (!task.dueDate) {
      continue;
    }

    const bucket = map.get(task.dueDate) ?? [];
    bucket.push(task);
    map.set(task.dueDate, bucket);
  }

  return map;
});

/**
 * The grid cells.
 *
 * The status rail carries the day's *worst* attendance state across the roster,
 * because on an operational calendar the useful signal is "was there a problem
 * on this day", not "somebody was present". The count of people in is in the
 * cell text.
 */
const dayInfo = computed(() => {
  const info: Record<string, CalendarDayInfo> = {};

  function ensure(date: string): CalendarDayInfo {
    info[date] ??= { status: null, statusLabel: "", hours: null, eventCount: 0, taskCount: 0 };
    return info[date];
  }

  for (const [date, rows] of attendanceByDate.value) {
    const day = ensure(date);
    const present = rows.filter((row) => row.status === "present" || row.status === "corrected").length;
    const missing = rows.filter((row) => row.status === "missing").length;
    const late = rows.filter((row) => row.status === "late").length;

    day.status = missing > 0 ? "missing" : late > 0 ? "late" : present > 0 ? "present" : null;
    day.statusLabel = `${present}/${rows.length} in`;
    day.hours = Math.round(rows.reduce((total, row) => total + (row.hours ?? 0), 0) * 10) / 10;
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

const monthSummary = computed(() => {
  const hours = Math.round(monthAttendance.value.reduce((total, row) => total + (row.hours ?? 0), 0) * 10) / 10;
  const events = eventsStore.items.filter((event) => event.date.startsWith(viewMonth.value)).length;

  return t(
    "admin.calendar.monthSummary",
    { records: monthAttendance.value.length, hours, count: events },
    events,
  );
});

/* ---------------------------------------------------------- Selected day */

const selectedAttendance = computed(() =>
  selectedDate.value ? attendanceByDate.value.get(selectedDate.value) ?? [] : [],
);

const selectedEvents = computed(() => (selectedDate.value ? eventsStore.eventsOn(selectedDate.value) : []));

const selectedTasks = computed(() =>
  selectedDate.value ? tasksByDate.value.get(selectedDate.value) ?? [] : [],
);

const selectedAbsent = computed(() => selectedAttendance.value.filter((row) => row.status === "missing"));
const selectedLate = computed(() => selectedAttendance.value.filter((row) => row.status === "late"));

const selectedLabel = computed(() => (selectedDate.value ? formatIsoDate(selectedDate.value) : ""));

/* ------------------------------------------------------------ Interaction */

function isMine(event: CalendarEvent) {
  return event.authorId === author.value.id;
}

function openEventDialog(event: CalendarEvent | null = null) {
  eventsStore.errorMessage = null;
  editingEvent.value = event;
  eventDialogVisible.value = true;
}

async function reloadEvents() {
  await eventsStore.loadAll();
}

async function saveEvent(values: CalendarEventFormValues) {
  const saved = await eventsStore.save(values, author.value, reloadEvents, editingEvent.value?.id);

  if (saved) {
    eventDialogVisible.value = false;
    editingEvent.value = null;
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

function openAttendance() {
  void router.push({ name: "attendance" });
}

function openMember(memberId: string) {
  void router.push({ name: "member-details", params: { memberId } });
}

function clearFilters() {
  eventsStore.resetFilters();
  void eventsStore.loadAll();
}

async function load() {
  attendanceStore.filters.studentId = "all";

  await Promise.all([
    eventsStore.loadAll(),
    attendanceStore.loadAttendance(),
    membersStore.loadAllMembers(),
    projectsStore.loadTasks(),
  ]);
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('admin.calendar.title')"
      :description="$t('admin.calendar.description')"
    >
      <template #actions>
        <BaseButton :label="$t('common.actions.refresh')" severity="secondary" outlined :loading="eventsStore.loading" @click="load" />
        <BaseButton @click="openEventDialog()">
          <PhCalendarPlus weight="bold" />
          {{ $t("admin.calendar.addEvent") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState v-if="attendanceStore.errorMessage" :message="attendanceStore.errorMessage" @retry="load" />
    <p v-if="eventsStore.errorMessage && !eventDialogVisible" class="form-error-banner">{{ eventsStore.errorMessage }}</p>

    <section class="metric-grid">
      <BaseStatsCard
        :label="$t('admin.calendar.metricRecords')"
        :value="String(monthAttendance.length)"
        :caption="$t('admin.calendar.metricRecordsCaption')"
      />
      <BaseStatsCard
        :label="$t('admin.calendar.metricEvents')"
        :value="String(eventsStore.items.filter((event) => event.date.startsWith(viewMonth)).length)"
        :caption="$t('admin.calendar.metricEventsCaption')"
      />
      <BaseStatsCard
        :label="$t('admin.calendar.metricSelected')"
        :value="`${selectedAttendance.filter((row) => row.status !== 'missing').length}/${selectedAttendance.length}`"
        :caption="
          selectedLabel
            ? $t('admin.calendar.presentOn', { date: selectedLabel })
            : $t('student.calendar.pickDay')
        "
      />
      <BaseStatsCard
        :label="$t('admin.calendar.metricAbsences')"
        :value="String(selectedAbsent.length)"
        :caption="
          selectedAbsent.length
            ? $t('admin.calendar.daysWithoutScan')
            : $t('admin.calendar.nobodyMissing')
        "
      />
    </section>

    <BaseFilterPanel :title="$t('admin.calendar.filtersTitle')" :description="$t('admin.calendar.filtersDescription')">
      <div class="filter-strip">
        <BaseSelect
          v-model="eventsStore.filters.visibility"
          :options="visibilityOptions"
          @update:model-value="eventsStore.loadAll()"
        />
        <BaseSelect
          v-model="eventsStore.filters.category"
          :options="categoryOptions"
          @update:model-value="eventsStore.loadAll()"
        />
        <BaseSelect
          v-model="eventsStore.filters.projectId"
          :options="projectFilterOptions"
          @update:model-value="eventsStore.loadAll()"
        />
        <BaseSelect
          v-model="eventsStore.filters.authorId"
          :options="authorFilterOptions"
          @update:model-value="eventsStore.loadAll()"
        />
        <BaseButton
          :label="$t('common.actions.clearFilters')"
          severity="secondary"
          outlined
          :disabled="!eventsStore.hasActiveFilters"
          @click="clearFilters"
        />
      </div>
    </BaseFilterPanel>

    <BaseLoading v-if="attendanceStore.loading && attendanceStore.items.length === 0" />

    <div v-else class="calendar-layout">
      <BaseCard>
        <CalendarMonthGrid
          :month="viewMonth"
          :selected="selectedDate"
          :days="dayInfo"
          :summary="monthSummary"
          @update:month="viewMonth = $event"
          @select="selectedDate = $event"
        />

        <template #footer>
          <p class="type-meta">
            {{ $t("admin.calendar.heatNote") }}
          </p>
        </template>
      </BaseCard>

      <BaseCard
        class="day-panel"
        :title="selectedLabel || $t('student.calendar.pickDay')"
        :description="
          selectedDate
            ? $t('admin.calendar.dayDescription')
            : $t('admin.calendar.pickDayDescription')
        "
      >
        <BaseEmptyState
          v-if="!selectedDate"
          :title="$t('admin.calendar.noDayTitle')"
          :description="$t('admin.calendar.noDayDescription')"
        />

        <template v-else>
          <section class="day-block">
            <p class="type-eyebrow day-block__title">{{ $t("admin.calendar.attendanceHeading") }}</p>

            <p v-if="selectedAttendance.length === 0" class="type-meta day-block__empty">
              {{ $t("admin.calendar.nothingRecorded") }}
            </p>

            <template v-else>
              <p class="type-meta day-block__summary">
                {{
                  $t("admin.calendar.recordedInCount", {
                    recorded: selectedAttendance.length - selectedAbsent.length,
                    total: selectedAttendance.length,
                  })
                }}
                <template v-if="selectedLate.length">
                  · {{ $t("admin.calendar.lateCount", { count: selectedLate.length }) }}
                </template>
                <template v-if="selectedAbsent.length">
                  · {{ $t("admin.calendar.missingScanCount", { count: selectedAbsent.length }) }}
                </template>
              </p>

              <ul class="day-list">
                <li v-for="row in selectedAttendance" :key="row.id" class="day-list__row">
                  <button type="button" class="day-list__main day-list__member" @click="openMember(row.studentId)">
                    <span class="day-list__title">{{ row.studentName }}</span>
                    <span class="type-meta">
                      {{
                        $t("admin.calendar.attendanceRow", {
                          entry: row.entry ?? "—",
                          exit: row.exit ?? "—",
                          hours: row.hours ?? 0,
                          device: row.deviceName,
                        })
                      }}
                    </span>
                  </button>
                  <BaseStatusPill
                    :label="attendanceStatusLabel(row.status)"
                    :tone="row.status === 'present' ? 'success' : row.status === 'corrected' ? 'info' : row.status === 'late' ? 'warning' : 'danger'"
                  />
                </li>
              </ul>

              <BaseButton :label="$t('admin.calendar.openAttendance')" severity="secondary" text size="small" @click="openAttendance" />
            </template>
          </section>

          <section v-if="selectedTasks.length" class="day-block">
            <p class="type-eyebrow day-block__title">{{ $t("admin.calendar.dueThisDay") }}</p>
            <ul class="day-list">
              <li v-for="task in selectedTasks" :key="task.id" class="day-list__row">
                <div class="day-list__main">
                  <span class="day-list__title">{{ task.title }}</span>
                  <span class="type-meta">
                    {{ task.projectName }}
                    <template v-if="task.assignees.length">
                      · {{ task.assignees.map((assignee) => assignee.name).join(', ') }}
                    </template>
                  </span>
                </div>
                <BaseBadge :label="task.isOverdue ? $t('common.time.overdue') : $t('common.time.due')" :tone="task.isOverdue ? 'danger' : 'warning'" />
              </li>
            </ul>
          </section>

          <section class="day-block">
            <p class="type-eyebrow day-block__title">{{ $t("admin.calendar.eventsHeading") }}</p>

            <ul v-if="selectedEvents.length" class="day-list">
              <li v-for="event in selectedEvents" :key="event.id" class="day-list__row">
                <div class="day-list__main">
                  <span class="day-list__title">{{ event.title }}</span>
                  <span class="type-meta">
                    <template v-if="event.startTime">
                      {{ event.startTime }}<template v-if="event.endTime">–{{ event.endTime }}</template> ·
                    </template>
                    {{ calendarVisibilityLabel(event.visibility) }} · {{ event.authorName }}
                  </span>
                  <span v-if="event.description" class="type-meta day-list__note">{{ event.description }}</span>
                </div>

                <div class="day-list__actions">
                  <BaseBadge
                    :label="calendarCategoryLabel(event.category)"
                    :tone="CALENDAR_CATEGORY_TONES[event.category]"
                  />
                  <!-- Only the author edits, staff included. -->
                  <template v-if="isMine(event)">
                    <BaseButton severity="secondary" text size="small" :aria-label="$t('admin.calendar.editEvent')" @click="openEventDialog(event)">
                      <PhPencilSimple weight="bold" />
                    </BaseButton>
                    <BaseButton severity="danger" text size="small" :aria-label="$t('admin.calendar.removeEvent')" @click="requestDelete(event.id)">
                      <PhTrash weight="bold" />
                    </BaseButton>
                  </template>
                </div>
              </li>
            </ul>

            <p v-else class="type-meta day-block__empty">{{ $t("admin.calendar.nothingPlanned") }}</p>

            <BaseButton severity="secondary" outlined size="small" @click="openEventDialog()">
              <PhCalendarPlus weight="bold" />
              {{ $t("admin.calendar.addEventOnDay") }}
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
      :title="$t('admin.calendar.removeEvent')"
      :message="$t('admin.calendar.removeMessage')"
      :confirm-label="$t('common.actions.remove')"
      :cancel-label="$t('common.actions.cancel')"
      severity="danger"
      @update:visible="deleteConfirmVisible = $event"
      @confirm="confirmDelete"
      @cancel="deleteConfirmVisible = false"
    />
  </section>
</template>

<style scoped>
.calendar-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
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

.day-block__empty,
.day-block__summary {
  margin: 0 0 var(--space-2);
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

.day-list__member {
  border: 0;
  background: none;
  padding: 0;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.day-list__member:hover .day-list__title {
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

@media (max-width: 1080px) {
  .calendar-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .day-panel {
    position: static;
  }
}
</style>
