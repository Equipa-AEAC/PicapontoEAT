<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import BaseAvatar from "../../../../components/base/BaseAvatar.vue";
import BaseBadge from "../../../../components/base/BaseBadge.vue";
import BaseButton from "../../../../components/base/BaseButton.vue";
import BaseCard from "../../../../components/base/BaseCard.vue";
import BaseDivider from "../../../../components/base/BaseDivider.vue";
import BaseEmptyState from "../../../../components/base/BaseEmptyState.vue";
import BaseErrorState from "../../../../components/base/BaseErrorState.vue";
import BaseLoading from "../../../../components/base/BaseLoading.vue";
import BasePageHeader from "../../../../components/base/BasePageHeader.vue";
import BaseSection from "../../../../components/base/BaseSection.vue";
import BaseStatsCard from "../../../../components/base/BaseStatsCard.vue";
import BaseTimeline from "../../../../components/base/BaseTimeline.vue";
import BaseConfirmDialog from "../../../../components/base/BaseConfirmDialog.vue";
import ParticipationTimeline from "../../../../components/participation/ParticipationTimeline.vue";
import ParticipationPeriodDialog from "../../../../components/participation/ParticipationPeriodDialog.vue";
import { useMembersStore } from "../../../../stores/members";
import { useParticipationStore } from "../../../../stores/participation";
import { useInternshipsStore, useProjectsStore } from "../../../../shared/stores";
import type { ParticipationPeriod, ParticipationPeriodFormValues } from "../../../../types/participation";
import { formatHours } from "../../../../utils/participation";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONES, TASK_STATUS_LABELS, TASK_STATUS_TONES } from "../../../../shared/types";
import { formatIsoDate } from "../../../../shared/utils/date";

const route = useRoute();
const router = useRouter();
const membersStore = useMembersStore();
const projectsStore = useProjectsStore();
const participationStore = useParticipationStore();
const internshipsStore = useInternshipsStore();

const memberId = computed(() => String(route.params.memberId ?? ""));

/**
 * Whether the member is an intern *right now*.
 *
 * Used only to decide which cards to render. It must never classify attendance:
 * a member who becomes an intern today did not retroactively spend last month on
 * a placement. That job belongs to `participationStore`, which reads the period
 * covering each record's own date.
 */
const isIntern = computed(() => membersStore.selectedMember?.internshipStatus !== "not-assigned");

const periodDialogVisible = ref(false);
const editingPeriod = ref<ParticipationPeriod | null>(null);
const removeConfirmVisible = ref(false);
const removingPeriod = ref<ParticipationPeriod | null>(null);

/** Internships this member holds, so an internship period can point at one. */
const memberInternships = computed(() =>
  internshipsStore.items.filter((item) => item.studentId === memberId.value),
);

function openAddPeriod() {
  editingPeriod.value = null;
  participationStore.errorMessage = null;
  periodDialogVisible.value = true;
}

function openEditPeriod(period: ParticipationPeriod) {
  editingPeriod.value = period;
  participationStore.errorMessage = null;
  periodDialogVisible.value = true;
}

async function submitPeriod(values: ParticipationPeriodFormValues) {
  const saved = await participationStore.save(memberId.value, values, editingPeriod.value?.id);

  if (saved) {
    periodDialogVisible.value = false;
    editingPeriod.value = null;
    // The member's derived hour figures move with the period.
    await membersStore.loadMember(memberId.value);
  }
}

function requestRemovePeriod(period: ParticipationPeriod) {
  removingPeriod.value = period;
  removeConfirmVisible.value = true;
}

async function confirmRemovePeriod() {
  if (!removingPeriod.value) {
    return;
  }

  await participationStore.remove(memberId.value, removingPeriod.value.id);
  removeConfirmVisible.value = false;
  removingPeriod.value = null;
  await membersStore.loadMember(memberId.value);
}

function openProject(projectId: string) {
  void router.push({ name: "project-details", params: { projectId } });
}

onMounted(async () => {
  if (memberId.value) {
    // The member record and their project work are two separate reads; the
    // record must not wait on the project query to render.
    await membersStore.loadMember(memberId.value);
    await Promise.all([
      participationStore.load(memberId.value),
      internshipsStore.loadInternships(),
      projectsStore.loadParticipantWork(memberId.value),
    ]);
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="membersStore.selectedMember?.fullName ?? 'Member details'"
      :description="membersStore.selectedMember ? `${membersStore.selectedMember.course} • ${membersStore.selectedMember.className}` : 'Review member identity, internship status and attendance history.'"
    >
      <template #actions>
        <BaseButton label="Back to members" severity="secondary" outlined @click="router.push({ name: 'members' })" />
        <BaseButton label="Attendance history" severity="secondary" outlined @click="router.push({ name: 'member-attendance-history', params: { memberId: memberId } })" />
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="membersStore.errorMessage"
      :message="membersStore.errorMessage"
    />

    <BaseLoading v-if="membersStore.loadingDetails" />

    <template v-else-if="membersStore.selectedMember">
      <section class="metric-grid">
        <!--
          Both figures come from the member's participation periods, so a day is
          counted under the participation that applied when it happened.
        -->
        <BaseStatsCard label="Team hours" :value="formatHours(participationStore.hours?.teamHours ?? 0)" caption="Days inside a Technical Team period — surplus-hours certificate" />
        <BaseStatsCard v-if="isIntern" label="FCT hours completed" :value="formatHours(participationStore.hours?.internshipHours ?? 0)" caption="Days inside an internship period only" />
        <BaseStatsCard v-if="isIntern" label="FCT hours required" :value="formatHours(membersStore.selectedMember.internshipRequiredHours)" caption="School requirement for the internship" />
        <BaseStatsCard v-if="isIntern" label="FCT hours remaining" :value="formatHours(membersStore.internship?.remainingHours ?? 0)" caption="Hours left to complete the internship" />
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
            <BaseDivider />
            <div class="student-profile-card__grid">
              <span>Email</span><strong>{{ membersStore.selectedMember.email }}</strong>
              <span>Phone</span><strong>{{ membersStore.selectedMember.phone }}</strong>
              <span>Emergency</span><strong>{{ membersStore.selectedMember.emergencyContact }}</strong>
              <span>Assigned Card</span><strong>{{ membersStore.selectedMember.assignedCardUid ?? 'Unassigned' }}</strong>
            </div>
          </div>
        </BaseCard>

        <BaseCard
          v-if="isIntern"
          title="FCT internship progress"
          description="Internship hours only. Volunteer team hours are counted separately and are not affected by this progress."
        >
          <div class="student-progress-card">
            <BaseBadge :label="membersStore.internship?.status ?? membersStore.selectedMember.internshipStatus" tone="info" />
            <div class="student-progress-card__meta">
              <span>Orientador de Estágio</span>
              <strong>{{ membersStore.internship?.orientador ?? membersStore.selectedMember.orientadorName ?? 'Unassigned' }}</strong>
            </div>
            <div class="student-progress-card__meta">
              <span>Monitor de Estágio</span>
              <strong>{{ membersStore.internship?.monitor ?? 'Unassigned' }}</strong>
            </div>
            <div class="student-progress-card__bar">
              <div class="student-progress-card__fill" :style="{ width: `${Math.round((membersStore.selectedMember.internshipCompletedHours / Math.max(membersStore.selectedMember.internshipRequiredHours, 1)) * 100)}%` }" />
            </div>
            <p>{{ membersStore.selectedMember.internshipCompletedHours }} of {{ membersStore.selectedMember.internshipRequiredHours }} FCT hours completed.</p>
          </div>
        </BaseCard>

        <BaseCard
          v-else
          title="Volunteer team member"
          description="This member helps around the club and has projects assigned. They are not carrying out an FCT internship."
        >
          <div class="module-summary">
            <BaseBadge label="Team member" tone="success" />
            <p><strong>Team hours:</strong> {{ membersStore.selectedMember.teamHours }}h registered as an Equipa Técnica volunteer.</p>
            <p>These hours are credited towards the surplus-hours certificate.</p>
          </div>
        </BaseCard>
      </section>

      <!--
        Member → projects and member → tasks. Both were already derivable from
        the assignment data; only the route between them was missing, so
        answering "what is this person working on" meant going to the project
        workspace and filtering by hand.
      -->
      <!--
        Placed above project work and attendance because it is the thing that
        explains both totals at the top of the page: which participation applied,
        when, and how many hours belong to it.
      -->
      <BaseSection
        title="Participation history"
        description="How this member was participating over time. Attendance is counted under the period that covered the day it happened."
      >
        <BaseCard>
          <template #header>
            <BaseButton label="Add period" severity="secondary" outlined size="small" @click="openAddPeriod" />
          </template>

          <BaseErrorState
            v-if="participationStore.errorMessage && !periodDialogVisible"
            :message="participationStore.errorMessage"
            @retry="participationStore.load(memberId)"
          />

          <BaseLoading v-if="participationStore.loading" />

          <ParticipationTimeline
            v-else
            :hours="participationStore.hours"
            :timeline="participationStore.timeline"
            editable
            @add="openAddPeriod"
            @edit="openEditPeriod"
            @remove="requestRemovePeriod"
          />
        </BaseCard>
      </BaseSection>

      <BaseSection title="Project work" description="Projects this member is on, and the work assigned to them.">
        <div class="dashboard-grid">
          <BaseCard title="Projects" :description="`${projectsStore.participantProjects.length} assigned`">
            <BaseEmptyState
              v-if="projectsStore.participantProjects.length === 0"
              title="Not on any project"
              description="Add them to a project from the project's own page."
            />

            <ul v-else class="link-list">
              <li v-for="project in projectsStore.participantProjects" :key="project.id" class="link-list__row">
                <button type="button" class="link-list__main" @click="openProject(project.id)">
                  <span class="link-list__title">{{ project.name }}</span>
                  <span class="type-meta">{{ project.owner }} · {{ project.progress.percent }}% complete</span>
                </button>
                <BaseBadge :label="PROJECT_STATUS_LABELS[project.status]" :tone="PROJECT_STATUS_TONES[project.status]" />
              </li>
            </ul>
          </BaseCard>

          <BaseCard title="Open tasks" :description="`${projectsStore.focusTasks.length} assigned`">
            <BaseEmptyState
              v-if="projectsStore.focusTasks.length === 0"
              title="No open tasks"
              description="Everything assigned to this member is done."
            />

            <ul v-else class="link-list">
              <li v-for="task in projectsStore.focusTasks" :key="task.id" class="link-list__row">
                <button type="button" class="link-list__main" @click="openProject(task.projectId)">
                  <span class="link-list__title">{{ task.title }}</span>
                  <span class="type-meta">
                    {{ task.projectName }}
                    <template v-if="task.dueDate"> · due {{ formatIsoDate(task.dueDate) }}</template>
                  </span>
                </button>
                <BaseBadge
                  :label="task.isOverdue ? 'Overdue' : TASK_STATUS_LABELS[task.status]"
                  :tone="task.isOverdue ? 'danger' : TASK_STATUS_TONES[task.status]"
                />
              </li>
            </ul>
          </BaseCard>
        </div>
      </BaseSection>

      <ParticipationPeriodDialog
        :visible="periodDialogVisible"
        :period="editingPeriod"
        :internships="memberInternships"
        :saving="participationStore.saving"
        :error-message="participationStore.errorMessage"
        @update:visible="periodDialogVisible = $event"
        @submit="submitPeriod"
        @cancel="periodDialogVisible = false"
      />

      <BaseConfirmDialog
        :visible="removeConfirmVisible"
        title="Remove participation period"
        :message="removingPeriod
          ? `Remove ${removingPeriod.startDate} to ${removingPeriod.endDate ?? 'present'}? Attendance in that range stops counting towards either total until another period covers it.`
          : 'Remove this participation period?'"
        :loading="participationStore.saving"
        @update:visible="removeConfirmVisible = $event"
        @confirm="confirmRemovePeriod"
        @cancel="removeConfirmVisible = false"
      />

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
      description="This member may have been removed. Go back to the roster to pick another."
      action-label="Return to members"
      @action="router.push({ name: 'members' })"
    />
  </section>
</template>

<style scoped>
.link-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.link-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.link-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.link-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.link-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.link-list__main:hover .link-list__title {
  color: var(--primary);
}
</style>
