<script setup lang="ts">
import { computed, onMounted } from "vue";

import {
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BasePageHeader,
  BaseSection,
  BaseStatsCard,
  BaseStatusPill,
} from "../../../../shared/components/base";
import { useInternshipsStore, useMembersStore } from "../../../../shared/stores";
import { formatTimestamp } from "../../../../shared/utils/date";
import { useAuthStore } from "../../../../modules/authentication";

const authStore = useAuthStore();
const internshipsStore = useInternshipsStore();
const membersStore = useMembersStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization — see the note on
 * `authStore.currentMemberId`.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

const member = computed(() => membersStore.selectedMember);
const internship = computed(() => internshipsStore.selectedInternship);
const teamHours = computed(() => member.value?.teamHours ?? 0);
const canRequestSurplus = computed(() => teamHours.value > 0);
const canRequestFct = computed(() => internship.value?.status === "complete");

async function previewSurplus() {
  await internshipsStore.previewSurplusCertificate(memberId.value);
}

async function previewFct() {
  await internshipsStore.previewCertificate(memberId.value);
}

async function reload() {
  await Promise.all([membersStore.loadMember(memberId.value), internshipsStore.loadInternship(memberId.value)]);
}

onMounted(reload);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Certificates"
      description="Your volunteer team work and your FCT internship earn two separate certificates."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="membersStore.loadingDetails" @click="reload()" />
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="internshipsStore.errorMessage"
      :message="internshipsStore.errorMessage"
    />

    <BaseLoading v-if="membersStore.loadingDetails || internshipsStore.loadingDetails" />

    <template v-else>
      <section class="metric-grid">
        <BaseStatsCard label="Team hours" :value="String(teamHours)" caption="Volunteer work as an Equipa Técnica member" />
        <BaseStatsCard
          label="FCT hours"
          :value="internship ? String(internship.completedHours) : '—'"
          caption="Internship hours, counted separately"
        />
      </section>

      <BaseSection title="Available certificates">
        <div class="dashboard-grid">
          <BaseCard title="Surplus-hours certificate" description="Awarded for volunteer work as an Equipa Técnica team member.">
            <div class="module-summary">
              <BaseStatusPill :label="canRequestSurplus ? 'Available' : 'No hours yet'" :tone="canRequestSurplus ? 'success' : 'warning'" />
              <p>{{ teamHours }}h registered as a team member.</p>
              <BaseButton label="Preview certificate" severity="secondary" outlined :disabled="!canRequestSurplus" @click="previewSurplus()" />
            </div>
          </BaseCard>

          <BaseCard title="FCT internship certificate" description="Awarded once the official internship is complete.">
            <div class="module-summary">
              <template v-if="internship">
                <BaseStatusPill :label="internship.status" :tone="canRequestFct ? 'success' : 'info'" />
                <p>{{ internship.completedHours }} of {{ internship.requiredHours }} FCT hours completed at {{ internship.hostEntity }}.</p>
                <BaseButton label="Preview certificate" severity="secondary" outlined :disabled="!canRequestFct" @click="previewFct()" />
              </template>
              <BaseEmptyState
                v-else
                title="No internship assigned"
                description="You are registered as a volunteer team member. Only members carrying out an FCT internship earn this certificate."
              />
            </div>
          </BaseCard>
        </div>
      </BaseSection>

      <BaseCard v-if="internshipsStore.certificatePreview" title="Certificate preview" description="Mock output returned by the certificate generator.">
        <div class="module-summary">
          <p>{{ internshipsStore.certificatePreview.fileName }}</p>
          <p>{{ formatTimestamp(internshipsStore.certificatePreview.issuedAt) }}</p>
          <p>{{ internshipsStore.certificatePreview.summary }}</p>
        </div>
      </BaseCard>
    </template>
  </section>
</template>
