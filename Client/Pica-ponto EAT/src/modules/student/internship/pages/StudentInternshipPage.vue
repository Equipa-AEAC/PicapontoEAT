<script setup lang="ts">
import { computed, onMounted } from "vue";

import { BaseCard, BaseDataCard, BaseEmptyState, BaseLoading } from "../../../../shared/components/base";
import { usePortalStore } from "../../../../shared/stores";

const portalStore = usePortalStore();
const summary = computed(() => portalStore.summary);

onMounted(async () => {
  if (!portalStore.summary) {
    await portalStore.loadPortalSummary();
  }
});
</script>

<template>
  <section class="page-stack">
    <BaseLoading v-if="portalStore.loading" />

    <template v-else>
    <section class="metric-grid">
      <BaseDataCard title="Completed" :value="String(summary?.completedHours ?? 0)" description="Internship hours already completed" trend-label="Progress" />
      <BaseDataCard title="Remaining" :value="String(summary?.remainingHours ?? 0)" description="Hours still required" trend-label="Target" />
      <BaseDataCard title="Status" :value="summary?.currentInternshipStatus ?? '—'" description="Current internship phase" trend-label="Placement" />
    </section>

    <BaseCard title="Milestones" description="Achievements earned during internship progress.">
      <article v-for="achievement in summary?.achievements ?? []" :key="achievement.id" class="portal-note">
        <h3>{{ achievement.title }}</h3>
        <p>{{ achievement.description }}</p>
      </article>
      <BaseEmptyState v-if="(summary?.achievements ?? []).length === 0" title="No milestones yet" description="No internship milestones are available in the mock dataset." />
    </BaseCard>
    </template>
  </section>
</template>
