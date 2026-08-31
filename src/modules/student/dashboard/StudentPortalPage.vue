<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import BaseButton from "../../../components/base/BaseButton.vue";
import BaseEmptyState from "../../../components/base/BaseEmptyState.vue";
import BaseLoading from "../../../components/base/BaseLoading.vue";
import BaseBadge from "../../../components/base/BaseBadge.vue";
import BaseCard from "../../../components/base/BaseCard.vue";
import BaseDataCard from "../../../components/base/BaseDataCard.vue";
import BasePageHeader from "../../../components/base/BasePageHeader.vue";
import BaseStatusPill from "../../../components/base/BaseStatusPill.vue";
import { usePortalStore } from "../../../stores/portal";
import { useAttendanceStore } from "../../../stores/attendance";
import { useAuthStore } from "../../../modules/authentication";
import { hoursByMonth, hoursByWeekday, mostRecent } from "../../../utils/attendanceStats";
import { formatIsoDate } from "../../../utils/date";

const router = useRouter();
const portalStore = usePortalStore();
const attendanceStore = useAttendanceStore();
const authStore = useAuthStore();
const portalError = ref<string | null>(null);

const portal = computed(() => portalStore.summary);

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

/** This member's attendance — the one source every card below is built from. */
const myAttendance = computed(() => attendanceStore.items.filter((row) => row.studentId === memberId.value));

/**
 * Every one of these is derived from `myAttendance`.
 *
 * They used to be hand-written arrays on the portal summary that owed nothing to
 * the attendance collection: seven fixed July days in the strip, rhythm bars
 * claiming hours on weekdays this member never worked, and a "Recent attendance"
 * list of days no longer in the record. Two cards on one page cannot be allowed
 * to contradict each other, and a correction has to move all of them at once.
 */
const attendanceCalendar = computed(() => mostRecent(myAttendance.value, 7).reverse());
const recentAttendance = computed(() => mostRecent(myAttendance.value, 5));
const weeklyStatistics = computed(() => hoursByWeekday(myAttendance.value));
const monthlyStatistics = computed(() => hoursByMonth(myAttendance.value, 4));
const achievements = computed(() => portal.value?.achievements ?? []);
const announcements = computed(() => portal.value?.announcements ?? []);

const completionProgress = computed(() => {
  const completed = portal.value?.completedHours ?? 0;
  const remaining = portal.value?.remainingHours ?? 0;
  const total = completed + remaining;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
});

/** The canonical `AttendanceStatus` values — `absent` and `holiday` were never among them. */
const calendarToneMap: Record<string, "success" | "warning" | "danger" | "info"> = {
  present: "success",
  late: "warning",
  missing: "danger",
  corrected: "info",
};

function formatStatisticBar(value: number) {
  return `${Math.max(12, value * 9)}%`;
}

async function loadPortal() {
  portalError.value = null;

  try {
    attendanceStore.filters.studentId = memberId.value;
    await Promise.all([portalStore.loadPortalSummary(memberId.value), attendanceStore.loadAttendance()]);
  } catch (error) {
    portalError.value = error instanceof Error ? error.message : "Unable to load the student portal summary.";
  }
}

onMounted(async () => {
  await loadPortal();
});
</script>

<template>
  <main class="student-portal">
    <section class="student-portal__hero">
      <BasePageHeader
        :title="portal?.profile.fullName ?? 'Loading portal'"
        :description="portal ? `${portal.profile.course} • ${portal.profile.className}` : 'Fetching your academic and attendance summary.'"
      >
        <template #actions>
            <BaseButton label="Refresh" severity="secondary" outlined :loading="portalStore.loading" @click="loadPortal()" />
          <!--
            The primary action on a student's own dashboard is the thing they owe
            the school every day, not an export. This replaces a button that had
            no handler at all.
          -->
          <BaseButton label="Write today's entry" @click="router.push({ name: 'student-daily-log' })" />
        </template>
      </BasePageHeader>

        <BaseLoading v-if="portalStore.loading" />

        <BaseEmptyState
          v-else-if="portalError"
          title="Dashboard unavailable"
          :description="portalError"
          action-label="Retry"
          @action="loadPortal()"
        />

        <template v-else-if="portal">
          <div class="student-portal__hero-grid">
            <BaseCard class="student-portal__profile-card" title="Profile" description="Your identity and internship oversight.">
              <div class="student-profile">
                <div class="student-profile__avatar" :style="portal.profile.photoUrl ? { backgroundImage: `url(${portal.profile.photoUrl})` } : undefined">
                  <span v-if="!portal.profile.photoUrl">{{ portal.profile.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2) }}</span>
                </div>
                <div>
                  <h3>{{ portal.profile.fullName }}</h3>
                  <p>{{ portal.profile.studentNumber }}</p>
                  <p>{{ portal.profile.email }}</p>
                  <p>{{ portal.profile.phone }}</p>
                  <BaseStatusPill :label="portal.currentInternshipStatus" :tone="portalStore.loading ? 'warning' : 'success'" />
                </div>
              </div>
            </BaseCard>

            <section class="student-portal__stats-grid">
              <!-- Named so neither figure can be read as "all the hours I have done". -->
              <BaseDataCard title="Internship hours" :value="String(portal.internshipHours)" description="Counted towards your FCT requirement" />
              <BaseDataCard title="Technical Team hours" :value="String(portal.teamHours)" description="Volunteer time, counted separately" />
              <BaseDataCard title="Attendance today" :value="portal.attendanceToday" description="Today’s live attendance state" />
              <BaseDataCard title="Internship progress" :value="`${completionProgress}%`" description="Overall placement completion" />
            </section>
          </div>
        </template>

    </section>

      <template v-if="portal">
        <section class="student-portal__grid">
          <BaseCard title="Attendance calendar" description="Your recent attendance pattern across the current week.">
            <div v-if="attendanceCalendar.length" class="attendance-calendar">
              <article v-for="day in attendanceCalendar" :key="day.date" class="attendance-calendar__day" :class="`attendance-calendar__day--${day.status}`">
                <span>{{ day.date.slice(8, 10) }}</span>
                <BaseStatusPill :label="day.status" :tone="calendarToneMap[day.status]" />
              </article>
            </div>
            <BaseEmptyState v-else title="No calendar entries" description="Your daily attendance appears here once you scan your card at a terminal." />
          </BaseCard>

          <BaseCard title="Weekly and monthly rhythm" description="Hours by weekday, then by month, across your recorded days.">
            <div v-if="weeklyStatistics.length || monthlyStatistics.length" class="progress-bars">
              <div v-for="item in weeklyStatistics" :key="item.label" class="progress-bars__row">
                <span>{{ item.label }}</span>
                <div class="progress-bars__track">
                  <div class="progress-bars__fill progress-bars__fill--weekly" :style="{ width: formatStatisticBar(item.value) }" />
                </div>
                <strong>{{ item.value }}</strong>
              </div>
              <div v-for="item in monthlyStatistics" :key="item.label" class="progress-bars__row progress-bars__row--monthly">
                <span>{{ item.label }}</span>
                <div class="progress-bars__track">
                  <div class="progress-bars__fill progress-bars__fill--monthly" :style="{ width: formatStatisticBar(item.value) }" />
                </div>
                <strong>{{ item.value }}</strong>
              </div>
          </div>
            <BaseEmptyState v-else title="No statistics available" description="Hours logged per day and per week appear here once you have attendance records." />
          </BaseCard>
        </section>

        <section class="student-portal__grid">
          <BaseCard title="Recent attendance" description="Your latest attendance records.">
            <div v-if="recentAttendance.length" class="portal-table">
              <article v-for="record in recentAttendance" :key="record.id" class="portal-table__row">
                <div>
                  <strong>{{ formatIsoDate(record.date) }}</strong>
                  <p>{{ record.entry ?? '—' }} → {{ record.exit ?? '—' }}</p>
                </div>
                <div>
                  <p>{{ record.hours ?? 0 }} hours</p>
                  <BaseBadge :label="record.status" :tone="calendarToneMap[record.status]" />
                </div>
              </article>
            </div>
            <BaseEmptyState v-else title="No attendance records" description="Your most recent check-ins will be listed here." />
          </BaseCard>

          <BaseCard title="Announcements" description="Updates from the academic and internship team.">
            <article v-if="announcements.length" v-for="announcement in announcements" :key="announcement.id" class="portal-note">
              <h3>{{ announcement.title }}</h3>
              <p>{{ announcement.description }}</p>
              <BaseStatusPill :label="announcement.publishedAt" tone="info" />
            </article>
            <BaseEmptyState v-else title="No announcements" description="Notices from the coordination team will appear here." />
          </BaseCard>
        </section>

        <section class="student-portal__grid">
          <BaseCard title="Achievements" description="Milestones already earned in the portal.">
            <article v-if="achievements.length" v-for="achievement in achievements" :key="achievement.id" class="portal-note">
              <h3>{{ achievement.title }}</h3>
              <p>{{ achievement.description }}</p>
              <BaseStatusPill :label="achievement.achievedAt" tone="success" />
            </article>
            <BaseEmptyState v-else title="No achievements yet" description="Milestones are awarded as you progress through your internship hours." />
          </BaseCard>

          <BaseCard title="Internship oversight" description="Who follows your FCT internship, and where it stands.">
            <div class="student-portal__summary">
              <p><strong>Orientador de Estágio:</strong> {{ portal.profile.assignedOrientador }}</p>
              <p><strong>Monitor de Estágio:</strong> {{ portal.profile.assignedMonitor }}</p>
              <p><strong>Internship status:</strong> {{ portal.currentInternshipStatus }}</p>
              <p><strong>Completed hours:</strong> {{ portal.completedHours }}</p>
              <p><strong>Remaining hours:</strong> {{ portal.remainingHours }}</p>
              <p><strong>Progress:</strong> {{ portal.internshipProgress }}%</p>
            </div>
          </BaseCard>
        </section>
      </template>
  </main>
</template>

<style scoped>
.student-portal {
  display: grid;
  gap: var(--space-6);
}

/*
 * The hero is a plain bordered panel, not a gradient banner. It groups the
 * member's identity with today's status; the visual weight comes from being the
 * first block on the page rather than from decoration.
 */
.student-portal__hero {
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--surface);
  border: var(--border-width) solid var(--border);
}

.student-portal__hero-grid,
.student-portal__grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.student-portal__stats-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.student-profile {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.student-profile__avatar {
  width: 56px;
  height: 56px;
  flex: none;
  border-radius: var(--radius-lg);
  display: grid;
  place-items: center;
  background: var(--primary-subtle);
  background-size: cover;
  background-position: center;
  color: var(--primary-contrast);
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
}

.student-profile h3,
.portal-note h3 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
}

.progress-bars {
  display: grid;
  gap: var(--space-3);
}

.progress-bars__row {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: var(--space-3);
  align-items: center;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

.progress-bars__track {
  height: 6px;
  border-radius: var(--radius-pill);
  overflow: hidden;
  background: var(--track);
}

.progress-bars__fill {
  height: 100%;
  border-radius: inherit;
  transition: width var(--transition-base);
}

.progress-bars__fill--weekly {
  background: var(--primary);
}

.progress-bars__fill--monthly {
  background: var(--success);
}

.portal-table,
.student-portal__summary {
  display: grid;
  gap: var(--space-2);
}

.portal-table__row,
.portal-note {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface);
  border: var(--border-width) solid var(--border);
  font-size: var(--text-sm);
}

.portal-table__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
}
</style>
