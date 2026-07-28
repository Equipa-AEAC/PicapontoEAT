<script setup lang="ts">
import { computed, onMounted } from "vue";

import { BaseCard, BaseEmptyState, BaseLoading, BaseStatusPill } from "../../../../shared/components/base";
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

    <BaseCard v-else title="Student settings" description="Portal personalization and notification preferences.">
      <div class="module-summary">
        <BaseStatusPill label="Connected" tone="success" />
        <p>Preferences for {{ profile?.fullName ?? 'student' }} can be synchronized from backend profile APIs.</p>
      </div>
      <BaseEmptyState v-if="!profile" title="Settings unavailable" description="The current mock dataset does not contain a member profile yet." />
    </BaseCard>
  </section>
</template>
