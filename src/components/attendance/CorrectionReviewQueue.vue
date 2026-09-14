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
import { formatIsoDate, formatRelativeTime } from "../../shared/utils/date";
import { correctionKindLabel, correctionStatusLabel } from "../../i18n/vocabulary";
import { t } from "../../i18n";

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
  { label: correctionStatusLabel("pending"), value: "pending" },
  { label: correctionStatusLabel("approved"), value: "approved" },
  { label: correctionStatusLabel("rejected"), value: "rejected" },
  { label: correctionStatusLabel("withdrawn"), value: "withdrawn" },
  { label: t("components.correctionQueue.allRequests"), value: "all" },
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
    :title="$t('components.correctionQueue.title')"
    :description="$t('components.correctionQueue.description')"
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
      :title="$t('components.correctionQueue.emptyTitle')"
      :description="
        store.filters.status === 'pending'
          ? $t('components.correctionQueue.emptyNone')
          : $t('components.correctionQueue.emptyFiltered')
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
          <span class="review-list__kind type-label">{{ correctionKindLabel(request.kind) }}</span>
          <p class="review-list__reason">{{ request.reason }}</p>

          <span class="review-list__record type-meta">
            {{
              $t("components.correctionQueue.recordedAs", {
                entry: request.recordEntry ?? "—",
                exit: request.recordExit ?? "—",
                hours: request.recordHours ?? 0,
                device: request.recordDevice ?? $t("components.correctionQueue.unknownDevice"),
              })
            }}
            <template v-if="request.suggestedEntry || request.suggestedExit">
              <PhArrowRight weight="bold" />
              {{
                $t("components.correctionQueue.memberSays", {
                  entry: request.suggestedEntry ?? "—",
                  exit: request.suggestedExit ?? "—",
                })
              }}
            </template>
          </span>

          <span class="type-meta">
            {{ $t("components.correctionQueue.sentAgo", { when: formatRelativeTime(request.createdAt) }) }}
            <template v-if="request.resolvedAt">
              ·
              {{
                $t("components.correctionQueue.closedBy", {
                  name: request.resolvedBy,
                  when: formatRelativeTime(request.resolvedAt),
                })
              }}
              <template v-if="request.appliedToRecord">
                · {{ $t("components.correctionQueue.recordCorrected") }}
              </template>
            </template>
          </span>

          <p v-if="request.resolutionNote" class="review-list__note type-meta">“{{ request.resolutionNote }}”</p>
        </div>

        <div class="review-list__side">
          <BaseStatusPill :label="correctionStatusLabel(request.status)" :tone="statusTone(request.status)" />
          <BaseButton
            v-if="request.status === 'pending'"
            :label="$t('components.correctionQueue.review')"
            severity="secondary"
            size="small"
            @click="open(request)"
          />
        </div>
      </li>
    </ul>

    <BaseFormDialog
      :visible="reviewing !== null"
      :title="$t('components.correctionQueue.reviewTitle')"
      :confirm-label="$t('components.correctionQueue.saveDecision')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="store.saving"
      :confirm-disabled="!canResolve"
      @update:visible="reviewing = $event ? reviewing : null"
      @confirm="resolve"
      @cancel="reviewing = null"
    >
      <template v-if="reviewing">
        <div class="review-recap">
          <i18n-t keypath="components.correctionQueue.reportedLine" tag="p" class="review-recap__line" scope="global">
            <template #member><strong>{{ reviewing.memberName }}</strong></template>
            <template #date><strong>{{ formatIsoDate(reviewing.recordDate) }}</strong></template>
            <template #kind>{{ correctionKindLabel(reviewing.kind) }}</template>
          </i18n-t>
          <p class="review-recap__quote">“{{ reviewing.reason }}”</p>
          <p class="review-recap__line type-meta">
            {{
              $t("components.correctionQueue.currentlyReads", {
                entry: reviewing.recordEntry ?? "—",
                exit: reviewing.recordExit ?? "—",
                device: reviewing.recordDevice ?? $t("components.correctionQueue.unknownDevice"),
              })
            }}
          </p>
        </div>

        <div class="review-toggle">
          <BaseCheckbox v-model="approve" />
          <span>
            <strong>{{ $t("components.correctionQueue.approve") }}</strong>
            <span class="type-meta">{{ $t("components.correctionQueue.approveHint") }}</span>
          </span>
        </div>

        <div class="review-toggle" :class="{ 'review-toggle--disabled': !approve }">
          <BaseCheckbox v-model="applyCorrection" :disabled="!approve" />
          <span>
            <strong>{{ $t("components.correctionQueue.alsoCorrect") }}</strong>
            <span class="type-meta">{{ $t("components.correctionQueue.alsoCorrectHint") }}</span>
          </span>
        </div>

        <div v-if="approve && applyCorrection" class="field-row">
          <label class="field">
            <span class="field__label type-label">{{ $t("common.fields.checkIn") }}</span>
            <BaseTextInput v-model="entryTime" type="time" />
          </label>
          <label class="field">
            <span class="field__label type-label">{{ $t("common.fields.checkOut") }}</span>
            <BaseTextInput v-model="exitTime" type="time" />
          </label>
        </div>

        <label class="field">
          <span class="field__label type-label">
            {{
              approve
                ? $t("components.correctionQueue.noteOptional")
                : $t("components.correctionQueue.noteRequired")
            }}
          </span>
          <BaseTextarea
            v-model="note"
            :rows="3"
            :placeholder="
              approve
                ? $t('components.correctionQueue.approveNotePlaceholder')
                : $t('components.correctionQueue.rejectNotePlaceholder')
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
