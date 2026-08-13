<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import BaseButton from "../../../components/base/BaseButton.vue";
import BaseEmptyState from "../../../components/base/BaseEmptyState.vue";
import BaseLoading from "../../../components/base/BaseLoading.vue";
import BaseBadge from "../../../components/base/BaseBadge.vue";
import BaseCard from "../../../components/base/BaseCard.vue";
import BaseDataCard from "../../../components/base/BaseDataCard.vue";
import BasePageHeader from "../../../components/base/BasePageHeader.vue";
import BaseStatusPill from "../../../components/base/BaseStatusPill.vue";
import { usePortalStore } from "../../../stores/portal";

const portalStore = usePortalStore();
const portalError = ref<string | null>(null);

const portal = computed(() => portalStore.summary);
const attendanceCalendar = computed(() => portal.value?.attendanceCalendar ?? []);
const recentAttendance = computed(() => portal.value?.recentAttendance ?? []);
const weeklyStatistics = computed(() => portal.value?.weeklyStatistics ?? []);
const monthlyStatistics = computed(() => portal.value?.monthlyStatistics ?? []);
const achievements = computed(() => portal.value?.achievements ?? []);
const announcements = computed(() => portal.value?.announcements ?? []);

const completionProgress = computed(() => {
  const completed = portal.value?.completedHours ?? 0;
  const remaining = portal.value?.remainingHours ?? 0;
  const total = completed + remaining;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
});

const calendarToneMap: Record<string, "success" | "warning" | "danger" | "info"> = {
  present: "success",
  late: "warning",
  absent: "danger",
  holiday: "info",
};

function formatStatisticBar(value: number) {
  return `${Math.max(12, value * 9)}%`;
}

async function loadPortal() {
  portalError.value = null;

  try {
    await portalStore.loadPortalSummary();
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
          <BaseButton label="Download summary" />
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
              <BaseDataCard title="Completed hours" :value="String(portal.completedHours)" description="Internship time already completed" trend-label="On track" />
              <BaseDataCard title="Remaining hours" :value="String(portal.remainingHours)" description="Hours still required to finish" trend-label="Forecast" />
              <BaseDataCard title="Attendance today" :value="portal.attendanceToday" description="Today’s live attendance state" trend-label="Live status" />
              <BaseDataCard title="Internship progress" :value="`${completionProgress}%`" description="Overall placement completion" trend-label="Progress" />
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
            <BaseEmptyState v-else title="No calendar entries" description="The current mock portal summary does not include attendance calendar data." />
          </BaseCard>

          <BaseCard title="Weekly and monthly rhythm" description="Simple view of hours logged across recent periods.">
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
            <BaseEmptyState v-else title="No statistics available" description="The current mock portal summary does not include time series statistics." />
          </BaseCard>
        </section>

        <section class="student-portal__grid">
          <BaseCard title="Recent attendance" description="Your latest attendance records.">
            <div v-if="recentAttendance.length" class="portal-table">
              <article v-for="record in recentAttendance" :key="record.date" class="portal-table__row">
                <div>
                  <strong>{{ record.date }}</strong>
                  <p>{{ record.entry }} → {{ record.exit }}</p>
                </div>
                <div>
                  <p>{{ record.hours }} hours</p>
                  <BaseBadge :label="record.status" :tone="record.status === 'Present' ? 'success' : record.status === 'Holiday' ? 'info' : 'warning'" />
                </div>
              </article>
            </div>
            <BaseEmptyState v-else title="No attendance records" description="There are no recent attendance records in the mock dataset." />
          </BaseCard>

          <BaseCard title="Announcements" description="Updates from the academic and internship team.">
            <article v-if="announcements.length" v-for="announcement in announcements" :key="announcement.id" class="portal-note">
              <h3>{{ announcement.title }}</h3>
              <p>{{ announcement.description }}</p>
              <BaseStatusPill :label="announcement.publishedAt" tone="info" />
            </article>
            <BaseEmptyState v-else title="No announcements" description="There are no announcements in the mock portal summary." />
          </BaseCard>
        </section>

        <section class="student-portal__grid">
          <BaseCard title="Achievements" description="Milestones already earned in the portal.">
            <article v-if="achievements.length" v-for="achievement in achievements" :key="achievement.id" class="portal-note">
              <h3>{{ achievement.title }}</h3>
              <p>{{ achievement.description }}</p>
              <BaseStatusPill :label="achievement.achievedAt" tone="success" />
            </article>
            <BaseEmptyState v-else title="No achievements yet" description="There are no milestones available in the mock portal summary." />
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
  gap: 1.25rem;
}

.student-portal__hero {
  padding: 1.5rem;
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at top right, rgba(110, 168, 254, 0.18), transparent 32%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.82));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.student-portal__hero-grid,
.student-portal__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.student-portal__stats-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.student-profile {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.student-profile__avatar {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 1.25rem;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(110, 168, 254, 0.35), rgba(62, 207, 142, 0.28));
  background-size: cover;
  background-position: center;
  color: #eff6ff;
  font-size: 1.2rem;
  font-weight: 700;
}

.student-profile h3,
.portal-note h3 {
  margin: 0 0 0.25rem;
}

.attendance-calendar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 0.75rem;
}

.attendance-calendar__day {
  min-height: 5rem;
  border-radius: 1rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.attendance-calendar__day--present {
  box-shadow: inset 0 0 0 1px rgba(62, 207, 142, 0.4);
}

.attendance-calendar__day--late {
  box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.42);
}

.attendance-calendar__day--absent {
  box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.45);
}

.attendance-calendar__day--holiday {
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.38);
}

.progress-bars {
  display: grid;
  gap: 0.75rem;
}

.progress-bars__row {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.progress-bars__track {
  height: 0.75rem;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.12);
}

.progress-bars__fill {
  height: 100%;
  border-radius: inherit;
}

.progress-bars__fill--weekly {
  background: linear-gradient(90deg, rgba(110, 168, 254, 0.9), rgba(62, 207, 142, 0.8));
}

.progress-bars__fill--monthly {
  background: linear-gradient(90deg, rgba(250, 204, 21, 0.9), rgba(249, 115, 22, 0.8));
}

.portal-table,
.student-portal__summary {
  display: grid;
  gap: 0.875rem;
}

.portal-table__row,
.portal-note {
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.portal-table__row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
</style>