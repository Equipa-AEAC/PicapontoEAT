<script setup lang="ts">
import { computed, ref } from "vue";

import type { ProjectParticipant } from "../../types/projects";
import { t } from "../../i18n";
import { participantRoleLabel } from "../../i18n/vocabulary";

/**
 * Multi-select for people, grouped by where they come from.
 *
 * Members and staff accounts are listed under their own headers rather than mixed
 * into one alphabetical list, because "who is on this project" is usually answered
 * per group: pick the supervising coordinator, then pick the interns.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string[];
    participants: ProjectParticipant[];
    label?: string;
    /** Renders a filter box once the roster is longer than this. */
    searchThreshold?: number;
  }>(),
  { label: undefined, searchThreshold: 8 },
);

const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

const query = ref("");

const showSearch = computed(() => props.participants.length > props.searchThreshold);

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase();

  if (!needle) {
    return props.participants;
  }

  return props.participants.filter((participant) =>
    `${participant.name} ${participantRoleLabel(participant.role)}`.toLowerCase().includes(needle),
  );
});

const groups = computed(() => [
  {
    key: "member",
    label: t("projects.participants.members"),
    rows: filtered.value.filter((item) => item.source === "member"),
  },
  {
    key: "user",
    label: t("projects.participants.staff"),
    rows: filtered.value.filter((item) => item.source === "user"),
  },
]);

function toggle(participantId: string) {
  const next = props.modelValue.includes(participantId)
    ? props.modelValue.filter((id) => id !== participantId)
    : [...props.modelValue, participantId];

  emit("update:modelValue", next);
}
</script>

<template>
  <fieldset class="participant-picker">
    <legend class="participant-picker__legend type-label">
      {{ label ?? $t("projects.participants.legend") }}
      <span v-if="modelValue.length > 0" class="participant-picker__count">
        {{ $t("projects.participants.selected", { count: modelValue.length }) }}
      </span>
    </legend>

    <input
      v-if="showSearch"
      v-model="query"
      type="search"
      class="participant-picker__search base-text-input"
      :placeholder="$t('projects.participants.filter')"
      :aria-label="$t('projects.participants.filter')"
    />

    <div class="participant-picker__list">
      <template v-for="group in groups" :key="group.key">
        <p v-if="group.rows.length > 0" class="participant-picker__group type-eyebrow">{{ group.label }}</p>

        <label
          v-for="participant in group.rows"
          :key="participant.id"
          class="participant-picker__row"
          :class="{ 'participant-picker__row--selected': modelValue.includes(participant.id) }"
        >
          <input
            type="checkbox"
            :checked="modelValue.includes(participant.id)"
            @change="toggle(participant.id)"
          />
          <span class="participant-picker__name">{{ participant.name }}</span>
          <span class="participant-picker__role type-meta">
            {{ participantRoleLabel(participant.role) }}
            <template v-if="participant.isExternal"> · {{ $t("projects.participants.external") }}</template>
          </span>
        </label>
      </template>

      <p v-if="filtered.length === 0" class="participant-picker__empty type-meta">
        {{ $t("projects.participants.noMatches") }}
      </p>
    </div>
  </fieldset>
</template>

<style scoped>
.participant-picker {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.participant-picker__legend {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: 0;
  margin-bottom: var(--space-1);
}

.participant-picker__count {
  color: var(--foreground-muted);
  font-weight: var(--weight-regular);
}

.participant-picker__search {
  width: 100%;
}

.participant-picker__list {
  max-height: 220px;
  overflow-y: auto;
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  padding: var(--space-1);
}

.participant-picker__group {
  padding: var(--space-2) var(--space-2) var(--space-1);
}

.participant-picker__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.participant-picker__row:hover {
  background: var(--hover);
}

.participant-picker__row--selected {
  background: var(--selected);
}

.participant-picker__name {
  font-size: var(--text-sm);
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.participant-picker__empty {
  padding: var(--space-3);
  text-align: center;
}
</style>
