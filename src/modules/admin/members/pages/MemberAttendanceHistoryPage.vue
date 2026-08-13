<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import BaseButton from "../../../../components/base/BaseButton.vue";
import BaseCard from "../../../../components/base/BaseCard.vue";
import BaseEmptyState from "../../../../components/base/BaseEmptyState.vue";
import BaseLoading from "../../../../components/base/BaseLoading.vue";
import BasePageHeader from "../../../../components/base/BasePageHeader.vue";
import BaseSection from "../../../../components/base/BaseSection.vue";
import BaseTable from "../../../../components/base/BaseTable.vue";
import TableColumn from "../../../../components/base/TableColumn.vue";
import { useMembersStore } from "../../../../stores/members";

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
      :title="membersStore.selectedMember?.fullName ?? 'Attendance history'"
      description="Trace the member attendance timeline and the records that were corrected or missing."
    >
      <template #actions>
        <BaseButton label="Back to member" severity="secondary" outlined @click="router.push({ name: 'member-details', params: { memberId } })" />
      </template>
    </BasePageHeader>

    <BaseLoading v-if="membersStore.loadingDetails" />

    <BaseSection v-else>
      <BaseCard>
        <BaseTable :value="membersStore.attendanceHistory" dataKey="id" :rows="10" paginator>
          <template #empty>
            <BaseEmptyState title="No attendance records" description="There are no attendance entries available for this member." />
          </template>

          <TableColumn field="date" header="Date" sortable />
          <TableColumn field="entry" header="Entry" />
          <TableColumn field="exit" header="Exit" />
          <TableColumn field="hours" header="Hours" />
          <TableColumn field="deviceName" header="Device" sortable />
          <TableColumn field="status" header="Status" sortable />
        </BaseTable>
      </BaseCard>
    </BaseSection>
  </section>
</template>
