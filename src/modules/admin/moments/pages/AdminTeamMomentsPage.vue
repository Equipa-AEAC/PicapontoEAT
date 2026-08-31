<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PhCamera, PhEye, PhEyeSlash } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseLoading,
  BasePageHeader,
  BaseTabs,
} from "../../../../shared/components/base";
import type { BaseTabItem } from "../../../../shared/components/base";
import MomentCard from "../../../../components/moments/MomentCard.vue";
import MomentComposer from "../../../../components/moments/MomentComposer.vue";
import { useMomentsStore, useProjectsStore } from "../../../../shared/stores";
import type { MomentFormValues, TeamMomentSummary } from "../../../../shared/types";
import { MOMENT_LIFETIME_HOURS } from "../../../../shared/types";
import { formatFileSize } from "../../../../services/uploads.service";

/**
 * Team moments, administrator view.
 *
 * Two tabs: the gallery everyone sees, and the moderation queue — every unexpired
 * moment including hidden ones, with anything reported sorted to the top. Hiding is
 * reversible, and nothing needs deleting for its own sake because every moment
 * expires within a day regardless.
 */
const momentsStore = useMomentsStore();
const projectsStore = useProjectsStore();

const activeTab = ref("gallery");
const showComposer = ref(false);
const removeTarget = ref<TeamMomentSummary | null>(null);

const summary = computed(() => momentsStore.summary);

const tabs = computed<BaseTabItem[]>(() => [
  { value: "gallery", label: "Gallery", badge: momentsStore.moments.length },
  {
    value: "moderation",
    label: "Moderation",
    badge: momentsStore.reportedMoments.length || undefined,
  },
]);

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

onMounted(async () => {
  await Promise.all([momentsStore.loadGallery(), momentsStore.loadModerationQueue(), projectsStore.loadProjects()]);
});
</script>

<template>
  <div class="page-stack">
    <BasePageHeader
      title="Team moments"
      :description="`Photos of what the team is doing right now. Each one disappears ${MOMENT_LIFETIME_HOURS} hours after it is posted.`"
    >
      <template #actions>
        <BaseButton :disabled="momentsStore.remainingQuota === 0" @click="showComposer = true">
          <PhCamera weight="regular" />
          Post a moment
        </BaseButton>
      </template>
    </BasePageHeader>

    <p v-if="momentsStore.errorMessage" class="form-error-banner">{{ momentsStore.errorMessage }}</p>

    <div v-if="summary" class="metric-grid">
      <article class="base-metric-card">
        <p class="base-metric-card__label">Active moments</p>
        <p class="base-metric-card__value">{{ summary.activeMoments }}</p>
        <p class="base-metric-card__caption">visible in the gallery right now</p>
      </article>

      <article class="base-metric-card">
        <p class="base-metric-card__label">Contributors</p>
        <p class="base-metric-card__value">{{ summary.contributorsToday }}</p>
        <p class="base-metric-card__caption">people who posted in the last 24 hours</p>
      </article>

      <article class="base-metric-card" :class="{ 'base-metric-card--negative': summary.reportedMoments > 0 }">
        <p class="base-metric-card__label">Reported</p>
        <p class="base-metric-card__value">{{ summary.reportedMoments }}</p>
        <p class="base-metric-card__caption">{{ summary.hiddenMoments }} currently hidden</p>
      </article>

      <article class="base-metric-card">
        <p class="base-metric-card__label">Stored</p>
        <p class="base-metric-card__value">{{ formatFileSize(summary.storedBytes) }}</p>
        <p class="base-metric-card__caption">released automatically as moments expire</p>
      </article>
    </div>

    <BaseLoading v-if="momentsStore.loading && momentsStore.moments.length === 0 && momentsStore.moderationQueue.length === 0" />

    <BaseCard v-else>
      <BaseTabs v-model="activeTab" :tabs="tabs">
        <template #gallery>
          <BaseEmptyState
            v-if="momentsStore.groups.length === 0"
            title="Nothing posted today"
            description="When members post photos of what they are working on, they appear here for 24 hours."
            action-label="Post the first moment"
            @action="showComposer = true"
          />

          <!-- Grouped by person, so the gallery reads as "who did what today". -->
          <div v-else class="moment-groups">
            <section v-for="group in momentsStore.groups" :key="group.authorId" class="moment-group">
              <header class="moment-group__header">
                <h3 class="type-card-title">{{ group.authorName }}</h3>
                <span class="type-meta">
                  {{ group.moments.length }} {{ group.moments.length === 1 ? 'moment' : 'moments' }}
                  <template v-if="group.authorIsExternal"> · External</template>
                </span>
              </header>

              <div class="moment-grid">
                <MomentCard
                  v-for="moment in group.moments"
                  :key="moment.id"
                  :moment="moment"
                  can-remove
                  @remove="removeTarget = $event"
                />
              </div>
            </section>
          </div>
        </template>

        <template #moderation>
          <BaseEmptyState
            v-if="momentsStore.moderationQueue.length === 0"
            title="Nothing to moderate"
            description="Reported and hidden moments show up here while they are still within their 24 hours."
          />

          <div v-else class="moment-grid">
            <div v-for="moment in momentsStore.moderationQueue" :key="moment.id" class="moderation-item">
              <MomentCard :moment="moment" can-remove @remove="removeTarget = $event" />

              <div v-if="moment.reports.length > 0" class="moderation-item__reports">
                <p class="type-eyebrow">Reports</p>
                <ul>
                  <li v-for="report in moment.reports" :key="report.id" class="type-meta">
                    <strong>{{ report.reporterName }}</strong> — {{ report.reason }}
                    <template v-if="report.note">: {{ report.note }}</template>
                  </li>
                </ul>
              </div>

              <div class="moderation-item__actions">
                <BaseButton
                  v-if="moment.status !== 'hidden'"
                  severity="secondary"
                  size="small"
                  @click="momentsStore.hide(moment.id)"
                >
                  <PhEyeSlash weight="regular" />
                  Hide
                </BaseButton>
                <BaseButton v-else severity="secondary" size="small" @click="momentsStore.restore(moment.id)">
                  <PhEye weight="regular" />
                  Restore
                </BaseButton>
              </div>
            </div>
          </div>
        </template>
      </BaseTabs>
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
      title="Remove moment"
      message="This photo will be removed from the gallery immediately."
      confirm-label="Remove"
      @update:visible="removeTarget = null"
      @confirm="confirmRemove"
      @cancel="removeTarget = null"
    />
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

.moderation-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.moderation-item__reports {
  padding: var(--space-2) var(--space-3);
  border: var(--border-width) solid var(--warning-border);
  border-radius: var(--radius-md);
  background: var(--warning-subtle);
}

.moderation-item__reports ul {
  margin: var(--space-1) 0 0;
  padding-left: var(--space-4);
}

.moderation-item__actions {
  display: flex;
  gap: var(--space-2);
}
</style>
