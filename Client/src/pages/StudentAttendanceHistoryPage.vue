<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Column from "primevue/column";

import BaseCard from "../components/base/BaseCard.vue";
import BaseEmptyState from "../components/base/BaseEmptyState.vue";
import BaseLoading from "../components/base/BaseLoading.vue";
import BasePageHeader from "../components/base/BasePageHeader.vue";
import BaseSection from "../components/base/BaseSection.vue";
import BaseTable from "../components/base/BaseTable.vue";
import { useMembersStore } from "../stores/members";

const route = useRoute();
const router = useRouter();
const membersStore = useMembersStore();

const memberId = computed(() => String(route.params.memberId ?? ""));

onMounted(async () => {
  if (memberId.value) {
    await membersStore.loadMember(memberId.value);
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Attendance history"
      :title="membersStore.selectedMember?.fullName ?? 'Attendance history'"
      description="Trace the member attendance timeline and the records that were corrected or missing."
    >
      <template #actions>
        <Button label="Back to member" severity="secondary" outlined @click="router.push({ name: 'member-details', params: { memberId } })" />
      </template>
    </BasePageHeader>

    <BaseLoading v-if="membersStore.loadingDetails" />

    <BaseSection v-else>
      <BaseCard>
        <BaseTable :value="membersStore.attendanceHistory" dataKey="id" :rows="10" paginator>
          <template #empty>
            <BaseEmptyState title="No attendance records" description="There are no attendance entries available for this member." />
          </template>

          <Column field="date" header="Date" sortable />
          <Column field="entry" header="Entry" />
          <Column field="exit" header="Exit" />
          <Column field="hours" header="Hours" />
          <Column field="deviceName" header="Device" sortable />
          <Column field="status" header="Status" sortable />
        </BaseTable>
      </BaseCard>
    </BaseSection>
  </section>
</template>