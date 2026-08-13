<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";

import { BaseButton, BaseCard, BaseDataCard, BaseEmptyState, BaseLoading, BasePageHeader, BaseSection, BaseStatusPill } from "../../../../shared/components/base";
import { usePortalStore } from "../../../../shared/stores";

const portalStore = usePortalStore();
const router = useRouter();
const calendar = computed(() => portalStore.summary?.attendanceCalendar ?? []);

const statusTotals = computed(() =>
  calendar.value.reduce(
    (totals, day) => {
      totals[day.status] += 1;
      return totals;
    },
    { present: 0, late: 0, absent: 0, holiday: 0 },
  ),
);

onMounted(async () => {
  if (!portalStore.summary) {
    await portalStore.loadPortalSummary();
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Calendar"
      description="Review the weekly attendance calendar and status distribution for the current period."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="portalStore.loading" @click="portalStore.loadPortalSummary()" />
        <BaseButton label="Attendance" severity="secondary" outlined @click="router.push({ name: 'student-attendance' })" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseDataCard title="Present" :value="String(statusTotals.present)" description="Days marked present" trend-label="Stable" />
      <BaseDataCard title="Late" :value="String(statusTotals.late)" description="Days marked late" trend-label="Needs attention" />
      <BaseDataCard title="Absent" :value="String(statusTotals.absent)" description="Days marked absent" trend-label="Review" />
      <BaseDataCard title="Holiday" :value="String(statusTotals.holiday)" description="Days marked as holiday" trend-label="Calendar" />
    </section>

    <BaseLoading v-if="portalStore.loading" />

    <template v-else-if="calendar.length">
      <BaseSection title="Attendance calendar" description="Status badges mirror the data returned by the mock portal service.">
        <BaseCard>
          <div class="attendance-calendar">
            <article
              v-for="day in calendar"
              :key="day.date"
              class="attendance-calendar__day"
              :class="`attendance-calendar__day--${day.status}`"
            >
              <span>{{ day.date.slice(8, 10) }}</span>
              <BaseStatusPill :label="day.status" :tone="day.status === 'present' ? 'success' : day.status === 'late' ? 'warning' : day.status === 'absent' ? 'danger' : 'info'" />
            </article>
          </div>
        </BaseCard>
      </BaseSection>
    </template>

    <BaseEmptyState
      v-else
      title="Calendar unavailable"
      description="There are no attendance calendar entries available in the current mock dataset."
    />
  </section>
</template>
