<script setup lang="ts">
import { computed, onMounted } from "vue";

import { BaseCard, BaseEmptyState, BaseLoading } from "../../../../shared/components/base";
import { usePortalStore } from "../../../../shared/stores";

const portalStore = usePortalStore();
const profile = computed(() => portalStore.summary?.profile);

onMounted(async () => {
  if (!portalStore.summary) {
    await portalStore.loadPortalSummary();
  }
});
</script>

<template>
  <section class="page-stack">
    <BaseLoading v-if="portalStore.loading" />

    <BaseCard v-else title="Profile" description="Student identity and contact information.">
      <div class="module-summary" v-if="profile">
        <p><strong>Name:</strong> {{ profile.fullName }}</p>
        <p><strong>Student number:</strong> {{ profile.studentNumber }}</p>
        <p><strong>Course:</strong> {{ profile.course }}</p>
        <p><strong>Class:</strong> {{ profile.className }}</p>
        <p><strong>Email:</strong> {{ profile.email }}</p>
        <p><strong>Phone:</strong> {{ profile.phone }}</p>
        <p><strong>Supervisor:</strong> {{ profile.assignedSupervisor }}</p>
      </div>
      <BaseEmptyState v-else title="Profile unavailable" description="No student profile is available in the current mock dataset." />
    </BaseCard>
  </section>
</template>
