<script setup lang="ts">
import { computed } from "vue";
import { PhClock, PhFlag, PhTrash } from "@phosphor-icons/vue";

import { BaseAvatar, BaseBadge } from "../../shared/components/base";
import type { TeamMomentSummary } from "../../types/moments";

/**
 * One moment in the gallery.
 *
 * The remaining lifetime is shown on every card, because "this disappears in 4h" is
 * the whole point of the feature and hiding it would make the gallery look like a
 * permanent photo archive, which it is not.
 */
const props = defineProps<{
  moment: TeamMomentSummary;
  /** Shows the report control. Off for your own moments and in the admin queue. */
  canReport?: boolean;
  /** Shows the remove control. Set for your own moments and for administrators. */
  canRemove?: boolean;
}>();

const emit = defineEmits<{ report: [moment: TeamMomentSummary]; remove: [moment: TeamMomentSummary] }>();

const postedLabel = computed(() => {
  const minutes = props.moment.minutesSincePosted;

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  return `${Math.floor(minutes / 60)}h ago`;
});

const expiryLabel = computed(() => {
  const minutes = props.moment.minutesUntilExpiry;

  if (minutes < 60) return `${minutes}m left`;

  return `${Math.floor(minutes / 60)}h left`;
});

/** Under an hour left, the card says so more loudly. */
const expiringSoon = computed(() => props.moment.minutesUntilExpiry < 60);
</script>

<template>
  <figure class="moment-card" :class="{ 'moment-card--hidden': moment.status === 'hidden' }">
    <div class="moment-card__media">
      <img :src="moment.imageUrl" :alt="moment.caption || `Moment posted by ${moment.authorName}`" loading="lazy" />

      <span class="moment-card__expiry" :class="{ 'moment-card__expiry--soon': expiringSoon }">
        <PhClock weight="fill" />
        {{ expiryLabel }}
      </span>
    </div>

    <figcaption class="moment-card__body">
      <div class="moment-card__author">
        <BaseAvatar :label="moment.authorName" size="normal" />
        <div class="moment-card__identity">
          <span class="moment-card__name">{{ moment.authorName }}</span>
          <span class="moment-card__time type-meta">
            {{ postedLabel }}
            <template v-if="moment.projectName"> · {{ moment.projectName }}</template>
          </span>
        </div>

        <div class="moment-card__actions">
          <button
            v-if="canReport"
            type="button"
            class="icon-actions__button"
            aria-label="Report this moment"
            title="Report this moment"
            @click="emit('report', moment)"
          >
            <PhFlag weight="regular" />
          </button>
          <button
            v-if="canRemove"
            type="button"
            class="icon-actions__button icon-actions__button--danger"
            aria-label="Remove this moment"
            title="Remove this moment"
            @click="emit('remove', moment)"
          >
            <PhTrash weight="regular" />
          </button>
        </div>
      </div>

      <p v-if="moment.caption" class="moment-card__caption">{{ moment.caption }}</p>

      <div v-if="moment.status !== 'visible'" class="moment-card__flags">
        <BaseBadge v-if="moment.status === 'reported'" :label="`${moment.reports.length} report(s)`" tone="warning" />
        <BaseBadge v-if="moment.status === 'hidden'" label="Hidden" tone="danger" />
      </div>
    </figcaption>
  </figure>
</template>

<style scoped>
.moment-card {
  display: flex;
  flex-direction: column;
  margin: 0;
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  overflow: hidden;
}

.moment-card--hidden {
  opacity: 0.6;
}

.moment-card__media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--background-sunken);
}

.moment-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.moment-card__expiry {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  /* Fixed dark scrim: it sits on a photo, not on a themed surface. */
  background: rgba(15, 23, 42, 0.72);
  color: #f8fafc;
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  font-variant-numeric: tabular-nums;
}

.moment-card__expiry svg {
  width: 11px;
  height: 11px;
}

.moment-card__expiry--soon {
  background: rgba(179, 38, 30, 0.85);
}

.moment-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}

.moment-card__author {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.moment-card__identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
  line-height: var(--leading-tight);
}

.moment-card__name {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.moment-card__actions {
  display: flex;
  gap: 2px;
  flex: none;
}

.moment-card__caption {
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
  color: var(--foreground-secondary);
}

.moment-card__flags {
  display: flex;
  gap: var(--space-1);
}
</style>
