<script setup lang="ts">
import { PhBriefcase, PhUsersThree, PhWarningCircle } from "@phosphor-icons/vue";

import BaseButton from "../base/BaseButton.vue";
import BaseEmptyState from "../base/BaseEmptyState.vue";
import BaseStatusPill from "../base/BaseStatusPill.vue";
import type { MemberParticipationHours, ParticipationPeriod } from "../../types/participation";
import { PARTICIPATION_KIND_CREDIT, PARTICIPATION_KIND_LABELS } from "../../types/participation";
import { formatHours } from "../../utils/participation";
import { formatIsoDate } from "../../utils/date";

/**
 * A member's participation, as a history rather than a status.
 *
 * The question this answers is "what was this person, when, and how many hours
 * belong to that" — which a role column on an attendance table cannot answer,
 * because it repeats one fact per row and never shows the moment the category
 * changed. Reading downwards gives the current participation first and the
 * transitions beneath it.
 */
const props = defineProps<{
  hours: MemberParticipationHours | null;
  /** Newest first. */
  timeline: MemberParticipationHours["periods"];
  editable?: boolean;
}>();

const emit = defineEmits<{
  edit: [period: ParticipationPeriod];
  remove: [period: ParticipationPeriod];
  add: [];
}>();

const kindIcons = { "team-member": PhUsersThree, internship: PhBriefcase };

function rangeLabel(period: ParticipationPeriod): string {
  const from = formatIsoDate(period.startDate);
  return period.endDate ? `${from} → ${formatIsoDate(period.endDate)}` : `${from} → present`;
}
</script>

<template>
  <div class="participation">
    <BaseEmptyState
      v-if="timeline.length === 0"
      title="No participation recorded"
      description="Add a period so this member's attendance can be counted as team or internship hours. Until then it stays unclassified."
      :action-label="props.editable ? 'Add participation period' : undefined"
      @action="emit('add')"
    />

    <template v-else>
      <!--
        The two totals sit above the timeline because they are what the page is
        asked for; the timeline underneath explains how they were arrived at.
        They are never summed into one figure — that is the whole point.
      -->
      <div class="participation__totals">
        <div class="participation__total">
          <span class="type-label">Technical Team</span>
          <strong>{{ formatHours(props.hours?.teamHours ?? 0) }}</strong>
          <span class="type-meta">Surplus-hours certificate</span>
        </div>
        <div class="participation__total">
          <span class="type-label">Internship</span>
          <strong>{{ formatHours(props.hours?.internshipHours ?? 0) }}</strong>
          <span class="type-meta">FCT requirement</span>
        </div>
      </div>

      <p v-if="(props.hours?.unclassifiedDays ?? 0) > 0" class="participation__warning">
        <PhWarningCircle weight="fill" />
        {{ props.hours?.unclassifiedDays }} day(s) — {{ formatHours(props.hours?.unclassifiedHours ?? 0) }} —
        fall outside every period, so they count towards neither total. Extend a period to include them.
      </p>

      <ol class="participation__list">
        <li v-for="(entry, index) in timeline" :key="entry.period.id" class="participation__item">
          <span class="participation__marker" :class="`participation__marker--${entry.period.kind}`">
            <component :is="kindIcons[entry.period.kind]" weight="bold" />
          </span>

          <div class="participation__body">
            <div class="participation__head">
              <span class="participation__kind">{{ PARTICIPATION_KIND_LABELS[entry.period.kind] }}</span>
              <BaseStatusPill v-if="entry.period.endDate === null" label="Current" tone="success" />
              <span class="participation__hours">{{ formatHours(entry.hours) }}</span>
            </div>

            <p class="participation__range type-meta">
              {{ rangeLabel(entry.period) }} · {{ entry.days }} day(s) recorded
            </p>
            <p class="participation__credit type-meta">{{ PARTICIPATION_KIND_CREDIT[entry.period.kind] }}</p>
            <p v-if="entry.period.note" class="participation__note">{{ entry.period.note }}</p>

            <div v-if="props.editable" class="participation__actions">
              <BaseButton label="Edit" severity="secondary" text size="small" @click="emit('edit', entry.period)" />
              <BaseButton label="Remove" severity="danger" text size="small" @click="emit('remove', entry.period)" />
            </div>
          </div>

          <!-- Names the boundary between two periods, which is the thing being explained. -->
          <span v-if="index < timeline.length - 1" class="participation__transition type-label">transition</span>
        </li>
      </ol>
    </template>
  </div>
</template>

<style scoped>
.participation__totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.participation__total {
  display: grid;
  gap: 2px;
  padding: var(--space-3);
  border: var(--border-width) solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-subtle, var(--surface));
}

.participation__total strong {
  font-size: var(--text-lg);
  font-variant-numeric: tabular-nums;
}

.participation__warning {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
  padding: var(--space-3);
  border: var(--border-width) solid var(--warning-border, var(--border));
  border-radius: var(--radius-md);
  background: var(--warning-subtle, transparent);
  color: var(--warning-foreground, var(--foreground));
  font-size: var(--text-sm);
}

.participation__warning svg {
  flex: none;
  width: 16px;
  height: 16px;
}

.participation__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.participation__item {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-3);
  padding-bottom: var(--space-5);
}

/* The rail that makes consecutive periods read as one history. */
.participation__item:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 15px;
  top: 32px;
  bottom: 0;
  width: 2px;
  background: var(--border);
}

.participation__marker {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-pill);
  border: var(--border-width) solid var(--border);
  background: var(--surface);
  color: var(--foreground-secondary);
}

.participation__marker svg {
  width: 16px;
  height: 16px;
}

.participation__marker--internship {
  border-color: var(--primary);
  color: var(--primary);
}

.participation__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.participation__kind {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--foreground);
}

.participation__hours {
  margin-left: auto;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  font-variant-numeric: tabular-nums;
}

.participation__range,
.participation__credit {
  margin: 2px 0 0;
}

.participation__note {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
  color: var(--foreground-secondary);
  max-width: 70ch;
}

.participation__actions {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.participation__transition {
  position: absolute;
  left: 48px;
  bottom: 6px;
  color: var(--foreground-muted);
}

@media (max-width: 640px) {
  .participation__hours {
    margin-left: 0;
    width: 100%;
  }
}
</style>
