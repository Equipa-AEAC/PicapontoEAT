<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PhArrowRight } from "@phosphor-icons/vue";

import {
  BaseAvatar,
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BasePageHeader,
  BaseStatusPill,
} from "../../../../shared/components/base";
import { useAuthStore } from "../../../../modules/authentication";
import { usePortalStore } from "../../../../shared/stores";

/**
 * The student's own record.
 *
 * A student cannot edit any of this — the school owns the roster — so the page's
 * job is not a form. It is to show what is held, say plainly who to ask when
 * something is wrong, and hand off to the pages where the student *can* act.
 */
const router = useRouter();
const authStore = useAuthStore();
const portalStore = usePortalStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");


const summary = computed(() => portalStore.summary);
const profile = computed(() => summary.value?.profile);

/** Identity as the school records it. */
const identityRows = computed(() => {
  const value = profile.value;

  if (!value) {
    return [];
  }

  return [
    { label: "Student number", value: value.studentNumber },
    { label: "Course", value: value.course },
    { label: "Class", value: value.className },
    { label: "Email", value: value.email },
    { label: "Phone", value: value.phone },
  ];
});

/** Who supervises the placement, on each side of it. */
const oversightRows = computed(() => {
  const value = profile.value;

  if (!value) {
    return [];
  }

  return [
    { label: "Orientador de Estágio", value: value.assignedOrientador, note: "At the school you are enrolled at" },
    { label: "Monitor de Estágio", value: value.assignedMonitor, note: "At Equipa Técnica" },
  ];
});

const progress = computed(() => {
  const completed = summary.value?.completedHours ?? 0;
  const remaining = summary.value?.remainingHours ?? 0;
  const total = completed + remaining;

  return total > 0 ? Math.round((completed / total) * 100) : 0;
});

/**
 * The pages a student can actually do something on. Profile is a dead end
 * without them — this is the "what next" the page owes the reader.
 */
const shortcuts = [
  { label: "Write today's entry", route: "student-daily-log", hint: "Your daily work journal" },
  { label: "Check your hours", route: "student-worked-hours", hint: "Completed and remaining" },
  { label: "Attendance record", route: "student-attendance", hint: "Day-by-day check-ins" },
  { label: "Internship reports", route: "student-reports", hint: "Monthly and final" },
];

onMounted(async () => {
  if (!portalStore.summary) {
    await portalStore.loadPortalSummary(memberId.value);
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader title="Profile" description="What the school holds about you, and who to ask when it is wrong.">
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="portalStore.loading" @click="portalStore.loadPortalSummary(memberId)" />
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="portalStore.errorMessage"
      :message="portalStore.errorMessage"
      @retry="portalStore.loadPortalSummary(memberId)"
    />

    <BaseLoading v-if="portalStore.loading && !profile" />

    <BaseEmptyState
      v-else-if="!profile"
      title="Profile unavailable"
      description="Your profile could not be loaded. Try again, or ask the coordination team to check your record."
      action-label="Try again"
      @action="portalStore.loadPortalSummary(memberId)"
    />

    <template v-else>
      <BaseCard>
        <div class="identity">
          <BaseAvatar :label="profile.fullName" size="large" />

          <div class="identity__copy">
            <h2 class="type-section-title identity__name">{{ profile.fullName }}</h2>
            <p class="type-body-secondary identity__meta">{{ profile.course }} • {{ profile.className }}</p>
            <BaseStatusPill
              :label="summary?.currentInternshipStatus ?? 'No placement'"
              :tone="summary?.currentInternshipStatus === 'active' ? 'success' : 'info'"
            />
          </div>

          <div class="identity__progress">
            <p class="type-label">Internship progress</p>
            <p class="type-metric">{{ progress }}%</p>
            <p class="type-meta">
              {{ summary?.completedHours ?? 0 }} done · {{ summary?.remainingHours ?? 0 }} remaining
            </p>
          </div>
        </div>
      </BaseCard>

      <div class="dashboard-grid">
        <BaseCard title="Identity" description="Held by the school. Ask the coordination team to correct anything here.">
          <dl class="fact-list">
            <div v-for="row in identityRows" :key="row.label" class="fact-list__row">
              <dt class="fact-list__label type-label">{{ row.label }}</dt>
              <dd class="fact-list__value">{{ row.value }}</dd>
            </div>
          </dl>
        </BaseCard>

        <BaseCard title="Supervision" description="The two people who sign off on your internship.">
          <dl class="fact-list">
            <div v-for="row in oversightRows" :key="row.label" class="fact-list__row">
              <dt class="fact-list__label type-label">{{ row.label }}</dt>
              <dd class="fact-list__value">
                {{ row.value }}
                <span class="type-meta fact-list__note">{{ row.note }}</span>
              </dd>
            </div>
          </dl>
        </BaseCard>
      </div>

      <BaseCard title="What you can do" description="Profile is read-only. These are the pages where you act.">
        <ul class="shortcut-list">
          <li v-for="shortcut in shortcuts" :key="shortcut.route">
            <button type="button" class="shortcut-list__item" @click="router.push({ name: shortcut.route })">
              <span class="shortcut-list__label">{{ shortcut.label }}</span>
              <span class="shortcut-list__hint type-meta">{{ shortcut.hint }}</span>
              <PhArrowRight weight="bold" />
            </button>
          </li>
        </ul>
      </BaseCard>
    </template>
  </section>
</template>

<style scoped>
.identity {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-5);
}

.identity__copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-start;
  min-width: 0;
}

.identity__name,
.identity__meta {
  margin: 0;
}

.identity__progress {
  text-align: right;
}

.identity__progress p {
  margin: 0;
}

.fact-list {
  margin: 0;
  display: flex;
  flex-direction: column;
}

.fact-list__row {
  display: grid;
  grid-template-columns: minmax(120px, 200px) minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.fact-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.fact-list__value {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--foreground);
}

.fact-list__note {
  display: block;
}

.shortcut-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}

.shortcut-list__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-1) var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
}

.shortcut-list__item:hover {
  border-color: var(--primary);
  background: var(--hover);
}

.shortcut-list__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.shortcut-list__hint {
  grid-column: 1;
}

.shortcut-list__item svg {
  grid-row: span 2;
  width: 15px;
  height: 15px;
  color: var(--foreground-muted);
}

@media (max-width: 820px) {
  .identity {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .identity__progress {
    grid-column: 1 / -1;
    text-align: left;
  }

  .fact-list__row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-1);
  }
}
</style>
