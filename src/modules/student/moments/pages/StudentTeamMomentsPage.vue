<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PhCamera } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseFormDialog,
  BaseLoading,
  BasePageHeader,
  BaseSelect,
  BaseTextarea,
} from "../../../../shared/components/base";
import MomentCard from "../../../../components/moments/MomentCard.vue";
import MomentComposer from "../../../../components/moments/MomentComposer.vue";
import { useMomentsStore, useProjectsStore } from "../../../../shared/stores";
import type { MomentFormValues, MomentReportReason, TeamMomentSummary } from "../../../../shared/types";
import { MOMENT_LIFETIME_HOURS, MOMENT_REPORT_REASON_OPTIONS } from "../../../../shared/types";

/**
 * Team moments, member view.
 *
 * Members post and browse; they can take down their own moments and report somebody
 * else's, which is the whole moderation surface they need. Everything else is an
 * administrator decision on the admin page.
 */
const momentsStore = useMomentsStore();
const projectsStore = useProjectsStore();

const showComposer = ref(false);
const removeTarget = ref<TeamMomentSummary | null>(null);
const reportTarget = ref<TeamMomentSummary | null>(null);
const reportReason = ref<MomentReportReason>("inappropriate");
const reportNote = ref("");

const currentAuthorId = computed(() => momentsStore.currentAuthor.id);

async function submit(values: MomentFormValues) {
  const posted = await momentsStore.publish(values);

  if (posted) {
    showComposer.value = false;
  }
}

async function confirmRemove() {
  const target = removeTarget.value;
  removeTarget.value = null;

  if (target) {
    await momentsStore.remove(target.id);
  }
}

function openReport(moment: TeamMomentSummary) {
  reportTarget.value = moment;
  reportReason.value = "inappropriate";
  reportNote.value = "";
}

async function confirmReport() {
  const target = reportTarget.value;

  if (!target) {
    return;
  }

  await momentsStore.report(target.id, reportReason.value, reportNote.value);
  reportTarget.value = null;
}

onMounted(async () => {
  await Promise.all([momentsStore.loadGallery(), projectsStore.loadProjects()]);
});
</script>

<template>
  <div class="page-stack">
    <BasePageHeader
      title="Team moments"
      :description="`What the team is working on today. Photos disappear ${MOMENT_LIFETIME_HOURS} hours after they are posted.`"
    >
      <template #actions>
        <BaseButton :disabled="momentsStore.remainingQuota === 0" @click="showComposer = true">
          <PhCamera weight="regular" />
          Post a moment
        </BaseButton>
      </template>
    </BasePageHeader>

    <p v-if="momentsStore.errorMessage" class="form-error-banner">{{ momentsStore.errorMessage }}</p>

    <BaseLoading v-if="momentsStore.loading && momentsStore.moments.length === 0" />

    <BaseCard v-else>
      <BaseEmptyState
        v-if="momentsStore.groups.length === 0"
        title="Nothing posted yet today"
        description="Show what you are working on — the workshop, a repair, a project coming together."
        action-label="Post the first moment"
        @action="showComposer = true"
      />

      <div v-else class="moment-groups">
        <section v-for="group in momentsStore.groups" :key="group.authorId" class="moment-group">
          <header class="moment-group__header">
            <h3 class="type-card-title">
              {{ group.authorId === currentAuthorId ? 'You' : group.authorName }}
            </h3>
            <span class="type-meta">
              {{ group.moments.length }} {{ group.moments.length === 1 ? 'moment' : 'moments' }}
            </span>
          </header>

          <div class="moment-grid">
            <MomentCard
              v-for="moment in group.moments"
              :key="moment.id"
              :moment="moment"
              :can-remove="moment.authorId === currentAuthorId"
              :can-report="moment.authorId !== currentAuthorId"
              @remove="removeTarget = $event"
              @report="openReport"
            />
          </div>
        </section>
      </div>
    </BaseCard>

    <MomentComposer
      :visible="showComposer"
      :projects="projectsStore.allProjects"
      :loading="momentsStore.publishing"
      :remaining-quota="momentsStore.remainingQuota"
      :error-message="momentsStore.errorMessage"
      :prepare="momentsStore.prepareImage"
      @update:visible="showComposer = $event"
      @submit="submit"
    />

    <BaseConfirmDialog
      :visible="removeTarget !== null"
      title="Remove your moment"
      message="This photo will be removed from the gallery immediately."
      confirm-label="Remove"
      @update:visible="removeTarget = null"
      @confirm="confirmRemove"
      @cancel="removeTarget = null"
    />

    <BaseFormDialog
      :visible="reportTarget !== null"
      title="Report this moment"
      subtitle="An administrator will review it. The photo stays visible until they decide."
      confirm-label="Send report"
      @update:visible="reportTarget = null"
      @cancel="reportTarget = null"
      @confirm="confirmReport"
    >
      <div class="student-form">
        <div class="student-form__grid">
          <div class="student-form__full-width">
            <span class="student-form__label">Reason</span>
            <BaseSelect
              :model-value="reportReason"
              :options="MOMENT_REPORT_REASON_OPTIONS"
              @update:model-value="reportReason = $event as MomentReportReason"
            />
          </div>

          <div class="student-form__full-width">
            <span class="student-form__label">Anything else the administrator should know</span>
            <BaseTextarea v-model="reportNote" :rows="3" placeholder="Optional" />
          </div>
        </div>
      </div>
    </BaseFormDialog>
  </div>
</template>

<style scoped>
.moment-groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.moment-group__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
  margin-bottom: var(--space-3);
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.moment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: var(--space-4);
}
</style>
