<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { PhArrowRight, PhCheckCircle, PhPencilSimple } from "@phosphor-icons/vue";

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
import ProfileChangeRequestDialog from "../../../../components/profile/ProfileChangeRequestDialog.vue";
import { useAuthStore } from "../../../../modules/authentication";
import { usePortalStore, useProfileChangeRequestsStore } from "../../../../shared/stores";
import type { ProfileChangeField, ProfileChangeFormValues } from "../../../../shared/types";
import { PROFILE_CHANGE_STATUS_TONES } from "../../../../shared/types";
import { t } from "../../../../i18n";
import { internshipStatusLabel, profileFieldLabel } from "../../../../i18n/vocabulary";
import { formatRelativeTime } from "../../../../shared/utils/date";

/**
 * The student's own record, and the one thing they can now do about it.
 *
 * The page was honest and complete except for a gap: it said "ask the
 * coordination team to correct anything here" and gave no way to ask. A member
 * whose phone number changed had to find someone in person, exactly as attendance
 * corrections worked before they had a workflow.
 *
 * The record is still read-only. Requesting is not editing — the value on screen
 * does not move until a reviewer approves — and the page says which fields can be
 * requested and which are the school's to change.
 */
const router = useRouter();
const authStore = useAuthStore();
const portalStore = usePortalStore();
const requestsStore = useProfileChangeRequestsStore();

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

const dialogVisible = ref(false);
const dialogField = ref<ProfileChangeField>("email");

/** The three fields a member may ask about, with what the record holds now. */
const currentValues = computed<Record<ProfileChangeField, string>>(() => ({
  email: profile.value?.email ?? "",
  phone: profile.value?.phone ?? "",
  photo: profile.value?.photoUrl ?? "",
}));

const fieldsWithOpenRequest = computed(() =>
  requestsStore.openRequests.map((request) => request.field),
);

/**
 * Identity as the school records it.
 *
 * `requestable` splits the list into the fields a member can ask about and the
 * ones only the school changes — the page has to be explicit about which is
 * which, or every row looks equally negotiable.
 */
const identityRows = computed(() => {
  const value = profile.value;

  if (!value) {
    return [];
  }

  return [
    { label: t("student.profile.studentNumber"), value: value.studentNumber, field: null },
    { label: t("common.fields.course"), value: value.course, field: null },
    { label: t("common.fields.className"), value: value.className, field: null },
    { label: t("student.profile.fieldEmail"), value: value.email, field: "email" as ProfileChangeField },
    { label: t("student.profile.fieldPhone"), value: value.phone, field: "phone" as ProfileChangeField },
  ];
});

const oversightRows = computed(() => {
  const value = profile.value;

  if (!value) {
    return [];
  }

  return [
    {
      label: t("student.profile.orientador"),
      value: value.assignedOrientador,
      note: t("student.profile.orientadorNote"),
    },
    { label: t("student.profile.monitor"), value: value.assignedMonitor, note: t("student.profile.monitorNote") },
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
const shortcuts = computed(() => [
  {
    label: t("student.profile.shortcutEntry"),
    route: "student-daily-log",
    hint: t("student.profile.shortcutEntryHint"),
  },
  {
    label: t("student.profile.shortcutHours"),
    route: "student-worked-hours",
    hint: t("student.profile.shortcutHoursHint"),
  },
  {
    label: t("student.profile.shortcutAttendance"),
    route: "student-attendance",
    hint: t("student.profile.shortcutAttendanceHint"),
  },
  {
    label: t("student.profile.shortcutReports"),
    route: "student-reports",
    hint: t("student.profile.shortcutReportsHint"),
  },
]);

function openRequest(field: ProfileChangeField) {
  requestsStore.clearMessages();
  dialogField.value = field;
  dialogVisible.value = true;
}

async function submitRequest(values: ProfileChangeFormValues) {
  const sent = await requestsStore.submit(memberId.value, values);

  if (sent) {
    dialogVisible.value = false;
  }
}

async function load() {
  await Promise.all([
    portalStore.summary ? Promise.resolve() : portalStore.loadPortalSummary(memberId.value),
    requestsStore.loadMyRequests(memberId.value),
  ]);
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader :title="$t('student.profile.title')" :description="$t('student.profile.description')">
      <template #actions>
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="portalStore.loading"
          @click="load"
        />
        <BaseButton @click="openRequest('email')">
          <PhPencilSimple weight="bold" />
          {{ $t("student.profile.requestChange") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="portalStore.errorMessage"
      :message="portalStore.errorMessage"
      @retry="portalStore.loadPortalSummary(memberId)"
    />

    <p v-if="requestsStore.successMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ requestsStore.successMessage }}
    </p>
    <p v-if="requestsStore.errorMessage && !dialogVisible" class="form-error-banner">{{ requestsStore.errorMessage }}</p>

    <BaseLoading v-if="portalStore.loading && !profile" />

    <BaseEmptyState
      v-else-if="!profile"
      :title="$t('student.profile.unavailableTitle')"
      :description="$t('student.profile.unavailableDescription')"
      :action-label="$t('common.actions.retry')"
      @action="load"
    />

    <template v-else>
      <BaseCard>
        <div class="identity">
          <BaseAvatar :label="profile.fullName" size="large" />

          <div class="identity__copy">
            <h2 class="type-section-title identity__name">{{ profile.fullName }}</h2>
            <p class="type-body-secondary identity__meta">{{ profile.course }} • {{ profile.className }}</p>
            <BaseStatusPill
              :label="
                summary?.currentInternshipStatus
                  ? internshipStatusLabel(summary.currentInternshipStatus)
                  : $t('student.profile.noPlacement')
              "
              :tone="summary?.currentInternshipStatus === 'active' ? 'success' : 'info'"
            />
          </div>

          <div class="identity__progress">
            <p class="type-label">{{ $t("student.profile.internshipProgress") }}</p>
            <p class="type-metric">{{ progress }}%</p>
            <p class="type-meta">
              {{
                $t("student.profile.progressSplit", {
                  done: summary?.completedHours ?? 0,
                  remaining: summary?.remainingHours ?? 0,
                })
              }}
            </p>
          </div>
        </div>
      </BaseCard>

      <!-- Anything already asked comes before the record itself. -->
      <BaseCard
        v-if="requestsStore.openRequests.length"
        :title="$t('student.profile.waitingTitle')"
        :description="$t('student.profile.waitingDescription')"
      >
        <ul class="request-list">
          <li v-for="request in requestsStore.openRequests" :key="request.id" class="request-list__row">
            <div class="request-list__main">
              <span class="request-list__title">{{ profileFieldLabel(request.field) }}</span>
              <span class="type-meta">
                <template v-if="request.field !== 'photo'">
                  {{ request.currentValue || '—' }} → <strong>{{ request.requestedValue }}</strong>
                </template>
                <template v-else>{{ $t("student.profile.newPicture") }}</template>
              </span>
              <span class="type-meta">
                {{
                  $t("student.profile.sent", {
                    time: formatRelativeTime(request.createdAt),
                    reason: request.reason,
                  })
                }}
              </span>
            </div>
            <BaseButton
:label="$t('student.attendance.withdraw')"
              severity="secondary"
              text
              size="small"
              :loading="requestsStore.saving"
              @click="requestsStore.withdraw(request.id, memberId)"
            />
          </li>
        </ul>
      </BaseCard>

      <BaseCard
        v-if="requestsStore.answeredRequests.length"
        :title="$t('student.profile.answeredTitle')"
        :description="$t('student.profile.answeredDescription')"
      >
        <ul class="request-list">
          <li v-for="request in requestsStore.answeredRequests" :key="request.id" class="request-list__row">
            <div class="request-list__main">
              <span class="request-list__title">{{ profileFieldLabel(request.field) }}</span>
              <span class="type-meta">
                {{
                  request.resolutionNote ||
                  (request.appliedToRecord
                    ? $t("student.profile.recordUpdatedNote")
                    : $t("student.profile.noNote"))
                }}
              </span>
              <span class="type-meta">
                {{ request.resolvedBy ?? '—' }} · {{ formatRelativeTime(request.resolvedAt) }}
                <template v-if="request.appliedToRecord"> · {{ $t("student.profile.recordUpdated") }}</template>
              </span>
            </div>
            <BaseStatusPill
              :label="$t(`student.profile.changeStatus.${request.status}`)"
              :tone="PROFILE_CHANGE_STATUS_TONES[request.status]"
            />
          </li>
        </ul>
      </BaseCard>

      <div class="dashboard-grid">
        <BaseCard
          :title="$t('student.profile.identityTitle')"
          :description="$t('student.profile.identityDescription')"
        >
          <dl class="fact-list">
            <div v-for="row in identityRows" :key="row.label" class="fact-list__row">
              <dt class="fact-list__label type-label">{{ row.label }}</dt>
              <dd class="fact-list__value">
                <span>{{ row.value }}</span>
                <BaseButton
                  v-if="row.field"
                  :label="
                    fieldsWithOpenRequest.includes(row.field)
                      ? $t('student.profile.requested')
                      : $t('student.profile.requestChange')
                  "
                  severity="secondary"
                  text
                  size="small"
                  :disabled="fieldsWithOpenRequest.includes(row.field)"
                  @click="openRequest(row.field)"
                />
              </dd>
            </div>

            <div class="fact-list__row">
              <dt class="fact-list__label type-label">{{ $t("student.profile.fieldPhoto") }}</dt>
              <dd class="fact-list__value">
                <span>
                  {{ profile.photoUrl ? $t("student.profile.photoOnFile") : $t("student.profile.photoMissing") }}
                </span>
                <BaseButton
                  :label="
                    fieldsWithOpenRequest.includes('photo')
                      ? $t('student.profile.requested')
                      : $t('student.profile.requestChange')
                  "
                  severity="secondary"
                  text
                  size="small"
                  :disabled="fieldsWithOpenRequest.includes('photo')"
                  @click="openRequest('photo')"
                />
              </dd>
            </div>
          </dl>
        </BaseCard>

        <BaseCard
          :title="$t('student.profile.supervisionTitle')"
          :description="$t('student.profile.supervisionDescription')"
        >
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

      <BaseCard
        :title="$t('student.profile.shortcutsTitle')"
        :description="$t('student.profile.shortcutsDescription')"
      >
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

    <ProfileChangeRequestDialog
      :visible="dialogVisible"
      :member-name="profile?.fullName ?? ''"
      :current-values="currentValues"
      :fields-with-open-request="fieldsWithOpenRequest"
      :initial-field="dialogField"
      :busy="requestsStore.saving"
      :error-message="requestsStore.errorMessage"
      @update:visible="dialogVisible = $event"
      @save="submitRequest"
      @cancel="dialogVisible = false"
    />
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

.request-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.request-list__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.request-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.request-list__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.request-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
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
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
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
