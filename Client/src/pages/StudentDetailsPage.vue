<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Divider from "primevue/divider";

import BaseAvatar from "../components/base/BaseAvatar.vue";
import BaseBadge from "../components/base/BaseBadge.vue";
import BaseCard from "../components/base/BaseCard.vue";
import BaseEmptyState from "../components/base/BaseEmptyState.vue";
import BaseLoading from "../components/base/BaseLoading.vue";
import BasePageHeader from "../components/base/BasePageHeader.vue";
import BaseSection from "../components/base/BaseSection.vue";
import BaseStatsCard from "../components/base/BaseStatsCard.vue";
import BaseTimeline from "../components/base/BaseTimeline.vue";
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
      eyebrow="Member profile"
      :title="membersStore.selectedMember?.fullName ?? 'Member details'"
      :description="membersStore.selectedMember ? `${membersStore.selectedMember.course} • ${membersStore.selectedMember.className}` : 'Review member identity, internship status and attendance history.'"
    >
      <template #actions>
        <Button label="Back to members" severity="secondary" outlined @click="router.push({ name: 'members' })" />
        <Button label="Attendance history" severity="secondary" outlined @click="router.push({ name: 'member-attendance-history', params: { memberId: memberId } })" />
      </template>
    </BasePageHeader>

    <BaseLoading v-if="membersStore.loadingDetails" />

    <template v-else-if="membersStore.selectedMember">
      <section class="metric-grid">
        <BaseStatsCard label="Accumulated hours" :value="String(membersStore.selectedMember.accumulatedHours)" caption="Registered attendance hours" />
        <BaseStatsCard label="Required internship hours" :value="String(membersStore.selectedMember.internshipRequiredHours)" caption="School requirement" />
        <BaseStatsCard label="Completed internship hours" :value="String(membersStore.selectedMember.internshipCompletedHours)" caption="Current progress" />
        <BaseStatsCard label="Remaining hours" :value="String(Math.max(membersStore.selectedMember.internshipRequiredHours - membersStore.selectedMember.internshipCompletedHours, 0))" caption="Hours left to complete" />
      </section>

      <section class="dashboard-grid">
        <BaseCard title="Profile" description="Member identity and contact information.">
          <div class="student-profile-card">
            <BaseAvatar :image="membersStore.selectedMember.photoUrl" :label="membersStore.selectedMember.fullName" size="xlarge" />
            <div>
              <h3>{{ membersStore.selectedMember.fullName }}</h3>
              <p>{{ membersStore.selectedMember.memberNumber }}</p>
              <BaseBadge :label="membersStore.selectedMember.status" :tone="membersStore.selectedMember.status === 'active' ? 'success' : 'warning'" />
            </div>
            <Divider />
            <div class="student-profile-card__grid">
              <span>Email</span><strong>{{ membersStore.selectedMember.email }}</strong>
              <span>Phone</span><strong>{{ membersStore.selectedMember.phone }}</strong>
              <span>Emergency</span><strong>{{ membersStore.selectedMember.emergencyContact }}</strong>
              <span>Assigned Card</span><strong>{{ membersStore.selectedMember.assignedCardUid ?? 'Unassigned' }}</strong>
            </div>
          </div>
        </BaseCard>

        <BaseCard title="Internship progress" description="Status and progress tracking for the current internship.">
          <div class="student-progress-card">
            <BaseBadge :label="membersStore.internship?.status ?? membersStore.selectedMember.internshipStatus" tone="info" />
            <div class="student-progress-card__meta">
              <span>Supervisor</span>
              <strong>{{ membersStore.internship?.supervisor ?? membersStore.selectedMember.supervisorName ?? 'Unassigned' }}</strong>
            </div>
            <div class="student-progress-card__bar">
              <div class="student-progress-card__fill" :style="{ width: `${Math.round((membersStore.selectedMember.internshipCompletedHours / Math.max(membersStore.selectedMember.internshipRequiredHours, 1)) * 100)}%` }" />
            </div>
            <p>{{ membersStore.selectedMember.internshipCompletedHours }} of {{ membersStore.selectedMember.internshipRequiredHours }} hours completed.</p>
          </div>
        </BaseCard>
      </section>

      <BaseSection title="Attendance history" description="The most recent attendance records are ready for drill-down.">
        <BaseCard>
          <BaseTimeline
            :value="membersStore.attendanceHistory.map((item) => ({ title: item.date, description: `${item.entry} to ${item.exit} • ${item.deviceName}`, time: `${item.hours}h`, tone: item.status }))"
          />
          <BaseEmptyState
            v-if="membersStore.attendanceHistory.length === 0"
            title="No attendance history"
            description="This member has no recorded attendance events yet."
          />
        </BaseCard>
      </BaseSection>
    </template>

    <BaseEmptyState
      v-else
      title="Member not found"
      description="The requested record does not exist in the current mock dataset."
      action-label="Return to members"
      @action="router.push({ name: 'members' })"
    />
  </section>
</template>