<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { PhArrowRight, PhCheckCircle } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseCheckbox,
  BaseEmptyState,
  BaseFormDialog,
  BaseLoading,
  BaseSelect,
  BaseStatusPill,
  BaseTextInput,
  BaseTextarea,
} from "../../shared/components/base";
import { useAttendanceCorrectionsStore } from "../../shared/stores";
import type { AttendanceCorrectionRequestSummary, CorrectionRequestStatus } from "../../shared/types";
import { CORRECTION_KIND_LABELS, CORRECTION_STATUS_LABELS } from "../../shared/types";
import { formatIsoDate, formatRelativeTime } from "../../shared/utils/date";

/**
 * The reviewer's side of an attendance correction.
 *
 * Everything needed to decide sits in the row: what the member says is wrong,
 * their words, and the record as it stands right now. Approving and rewriting
 * the record are separate switches, because a reviewer can agree that something
 * went wrong and still want to set the times themselves.
 */
const emit = defineEmits<{ resolved: [] }>();

const router = useRouter();

/** Correction → member. This queue is admin-only, so the target always resolves. */
function openMember(memberId: string) {
  void router.push({ name: "member-details", params: { memberId } });
}

const store = useAttendanceCorrectionsStore();

const reviewing = ref<AttendanceCorrectionRequestSummary | null>(null);
const approve = ref(true);
const applyCorrection = ref(true);
const entryTime = ref("");
const exitTime = ref("");
const note = ref("");

const statusOptions = [
  { label: "Waiting for review", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Not changed", value: "rejected" },
  { label: "Withdrawn", value: "withdrawn" },
  { label: "All requests", value: "all" },
];

const rows = computed(() => store.requests);

/** Rejecting without a note leaves the member with no answer, so it is required. */
const canResolve = computed(() => approve.value || note.value.trim().length > 0);

function statusTone(status: CorrectionRequestStatus) {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  return "info";
}

function open(request: AttendanceCorrectionRequestSummary) {
  store.clearMessages();
  reviewing.value = request;
  approve.value = true;
  applyCorrection.value = request.suggestedEntry !== null || request.suggestedExit !== null;
  // Pre-fill with what the member proposed, falling back to what is recorded.
  entryTime.value = request.suggestedEntry ?? request.recordEntry ?? "";
  exitTime.value = request.suggestedExit ?? request.recordExit ?? "";
  note.value = "";
}

/** Rejecting cannot also rewrite the record — the two would contradict. */
watch(approve, (value) => {
  if (!value) {
    applyCorrection.value = false;
  }
});

async function resolve() {
  const request = reviewing.value;

  if (!request || !canResolve.value) {
    return;
  }

  const updated = await store.resolve(request.id, approve.value, {
    applyCorrection: applyCorrection.value,
    entryTime: entryTime.value,
    exitTime: exitTime.value,
    note: note.value,
  });

  if (updated) {
    reviewing.value = null;
    emit("resolved");
  }
}

watch(
  () => store.filters.status,
  () => void store.loadQueue(),
);
</script>

<template>
  <BaseCard
    title="Correction requests"
    description="Days members have reported as wrong. Approving can rewrite the record; the decision is audited either way."
  >
    <div class="queue-filter">
      <BaseSelect
        :model-value="store.filters.status"
        :options="statusOptions"
        @update:model-value="store.filters.status = $event as CorrectionRequestStatus | 'all'"
      />
    </div>

    <p v-if="store.successMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ store.successMessage }}
    </p>
    <p v-if="store.errorMessage" class="form-error-banner">{{ store.errorMessage }}</p>

    <BaseLoading v-if="store.loading && rows.length === 0" />

    <BaseEmptyState
      v-else-if="rows.length === 0"
      title="Nothing to review"
      :description="
        store.filters.status === 'pending'
          ? 'No member has reported an attendance problem. Requests land here as soon as they do.'
          : 'No requests match the status you picked.'
      "
    />

    <ul v-else class="review-list">
      <li v-for="request in rows" :key="request.id" class="review-list__row">
        <div class="review-list__main">
          <span class="review-list__title">
            <!--
              Correction → member. A reviewer deciding whether a day is wrong
              usually wants the rest of that member's month, which is one click
              away rather than a search on the members page.
            -->
            <button type="button" class="review-list__member" @click="openMember(request.memberId)">
              {{ request.memberName }}
            </button>
            · {{ formatIsoDate(request.recordDate) }}
          </span>
          <span class="review-list__kind type-label">{{ CORRECTION_KIND_LABELS[request.kind] }}</span>
          <p class="review-list__reason">{{ request.reason }}</p>

          <span class="review-list__record type-meta">
            Recorded {{ request.recordEntry ?? '—' }} – {{ request.recordExit ?? '—' }}
            ({{ request.recordHours ?? 0 }}h) at {{ request.recordDevice ?? 'unknown device' }}
            <template v-if="request.suggestedEntry || request.suggestedExit">
              <PhArrowRight weight="bold" />
              member says {{ request.suggestedEntry ?? '—' }} – {{ request.suggestedExit ?? '—' }}
            </template>
          </span>

          <span class="type-meta">
            Sent {{ formatRelativeTime(request.createdAt) }}
            <template v-if="request.resolvedAt">
              · closed by {{ request.resolvedBy }} {{ formatRelativeTime(request.resolvedAt) }}
              <template v-if="request.appliedToRecord"> · record corrected</template>
            </template>
          </span>

          <p v-if="request.resolutionNote" class="review-list__note type-meta">“{{ request.resolutionNote }}”</p>
        </div>

        <div class="review-list__side">
          <BaseStatusPill :label="CORRECTION_STATUS_LABELS[request.status]" :tone="statusTone(request.status)" />
          <BaseButton
            v-if="request.status === 'pending'"
            label="Review"
            severity="secondary"
            size="small"
            @click="open(request)"
          />
        </div>
      </li>
    </ul>

    <BaseFormDialog
      :visible="reviewing !== null"
      title="Review correction request"
      confirm-label="Save decision"
      :loading="store.saving"
      :confirm-disabled="!canResolve"
      @update:visible="reviewing = $event ? reviewing : null"
      @confirm="resolve"
      @cancel="reviewing = null"
    >
      <template v-if="reviewing">
        <div class="review-recap">
          <p class="review-recap__line">
            <strong>{{ reviewing.memberName }}</strong> reported
            <strong>{{ formatIsoDate(reviewing.recordDate) }}</strong>:
            {{ CORRECTION_KIND_LABELS[reviewing.kind] }}.
          </p>
          <p class="review-recap__quote">“{{ reviewing.reason }}”</p>
          <p class="review-recap__line type-meta">
            The record currently reads {{ reviewing.recordEntry ?? '—' }} – {{ reviewing.recordExit ?? '—' }}
            at {{ reviewing.recordDevice ?? 'unknown device' }}.
          </p>
        </div>

        <div class="review-toggle">
          <BaseCheckbox v-model="approve" />
          <span>
            <strong>Approve this request</strong>
            <span class="type-meta">Uncheck to close it without agreeing. The member sees your note.</span>
          </span>
        </div>

        <div class="review-toggle" :class="{ 'review-toggle--disabled': !approve }">
          <BaseCheckbox v-model="applyCorrection" :disabled="!approve" />
          <span>
            <strong>Also correct the attendance record</strong>
            <span class="type-meta">Rewrites the times, recalculates the hours and marks the day corrected.</span>
          </span>
        </div>

        <div v-if="approve && applyCorrection" class="field-row">
          <label class="field">
            <span class="field__label type-label">Check-in</span>
            <BaseTextInput v-model="entryTime" type="time" />
          </label>
          <label class="field">
            <span class="field__label type-label">Check-out</span>
            <BaseTextInput v-model="exitTime" type="time" />
          </label>
        </div>

        <label class="field">
          <span class="field__label type-label">
            Note for the member{{ approve ? ' (optional)' : ' (required)' }}
          </span>
          <BaseTextarea
            v-model="note"
            :rows="3"
            :placeholder="
              approve
                ? 'For example: checked the Lab 3 terminal log and corrected the check-out.'
                : 'Explain why the record is staying as it is.'
            "
          />
        </label>

        <p v-if="store.errorMessage" class="form-error-banner">{{ store.errorMessage }}</p>
      </template>
    </BaseFormDialog>
  </BaseCard>
</template>

<style scoped>
.review-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.review-list__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-4);
  padding: var(--space-4) 0;
}

.review-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.review-list__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.review-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--foreground);
}

/* Matches the task table's assignee link. */
.review-list__member {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.review-list__member:hover {
  color: var(--primary);
  text-decoration: underline;
}

.review-list__kind {
  color: var(--foreground-secondary);
}

.review-list__reason {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--foreground);
}

.review-list__record {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.review-list__record svg {
  width: 12px;
  height: 12px;
}

.review-list__note {
  margin: var(--space-1) 0 0;
  padding-left: var(--space-3);
  border-left: 2px solid var(--border);
  font-style: italic;
}

.review-list__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}

.review-recap {
  padding: var(--space-3);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-elevated);
}

.review-recap__line {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--foreground-secondary);
}

.review-recap__quote {
  margin: var(--space-2) 0;
  font-size: var(--text-sm);
  color: var(--foreground);
  font-style: italic;
}

.queue-filter {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-2);
}

.review-toggle {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: var(--space-3);
}

.review-toggle > span {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: var(--text-sm);
}

.review-toggle--disabled {
  opacity: 0.55;
}

.field {
  display: grid;
  gap: var(--space-2);
}

.field-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
}

@media (max-width: 820px) {
  .review-list__row {
    grid-template-columns: minmax(0, 1fr);
  }

  .review-list__side {
    align-items: flex-start;
    flex-direction: row;
  }
}
</style>
