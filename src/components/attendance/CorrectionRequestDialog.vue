<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { t } from "../../i18n";

import {
  BaseFormDialog,
  BaseSelect,
  BaseTextInput,
  BaseTextarea,
} from "../../shared/components/base";
import type { AttendanceSummary } from "../../shared/types";
import type { CorrectionRequestFormValues, CorrectionRequestKind } from "../../shared/types";
import { KINDS_WITH_TIMES, MAX_CORRECTION_REASON_LENGTH, MIN_CORRECTION_REASON_LENGTH } from "../../shared/types";
import { formatIsoDate } from "../../shared/utils/date";
import { correctionKindOptions } from "../../i18n/vocabulary";

/**
 * How a member asks for an attendance record to be fixed.
 *
 * Written for someone who has never used the system: it restates the record
 * being questioned in plain language, asks what is wrong from a short list, and
 * only asks for times when the answer needs them. No status, no reviewer, no
 * lifecycle — all of that is the reviewer's side of the workflow.
 */
const props = defineProps<{
  visible: boolean;
  record: AttendanceSummary | null;
  loading?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  submit: [values: CorrectionRequestFormValues];
}>();

const kind = ref<CorrectionRequestKind>("missing-exit");
const reason = ref("");
const suggestedEntry = ref("");
const suggestedExit = ref("");

const needsTimes = computed(() => KINDS_WITH_TIMES.includes(kind.value));
const remaining = computed(() => MAX_CORRECTION_REASON_LENGTH - reason.value.trim().length);
const tooShort = computed(() => reason.value.trim().length < MIN_CORRECTION_REASON_LENGTH);

/** Mirrors the service rule, so the member is told before they submit. */
const localError = computed(() => {
  if (tooShort.value) {
    return null; // Not an error until they try to submit.
  }

  if (needsTimes.value && !suggestedEntry.value && !suggestedExit.value) {
    return t("errors.correctionNeedsATime");
  }

  if (suggestedEntry.value && suggestedExit.value && suggestedExit.value <= suggestedEntry.value) {
    return t("errors.exitBeforeEntry");
  }

  return null;
});

const canSubmit = computed(() => !tooShort.value && localError.value === null);

/** Reset on open so a previous attempt never leaks into the next record. */
watch(
  () => props.visible,
  (open) => {
    if (!open) {
      return;
    }

    const record = props.record;

    kind.value = record?.exit ? "wrong-times" : "missing-exit";
    reason.value = "";
    suggestedEntry.value = record?.entry ?? "";
    suggestedExit.value = record?.exit ?? "";
  },
);

function submit() {
  if (!props.record || !canSubmit.value) {
    return;
  }

  emit("submit", {
    attendanceId: props.record.id,
    kind: kind.value,
    reason: reason.value.trim(),
    suggestedEntry: needsTimes.value ? suggestedEntry.value : "",
    suggestedExit: needsTimes.value ? suggestedExit.value : "",
  });
}
</script>

<template>
  <BaseFormDialog
    :visible="visible"
    :title="$t('components.correctionRequest.title')"
    :confirm-label="$t('components.correctionRequest.confirm')"
    :cancel-label="$t('common.actions.cancel')"
    :loading="loading"
    :confirm-disabled="!canSubmit"
    @update:visible="emit('update:visible', $event)"
    @confirm="submit"
    @cancel="emit('update:visible', false)"
  >
    <p v-if="record" class="record-recap">
      <i18n-t keypath="components.correctionRequest.recapAbout" tag="span">
        <template #date>
          <strong>{{ formatIsoDate(record.date) }}</strong>
        </template>
        <template #entry>
          <strong>{{ record.entry ?? $t("components.correctionRequest.noCheckIn") }}</strong>
        </template>
        <template #exit>
          <strong>{{ record.exit ?? $t("components.correctionRequest.noCheckOut") }}</strong>
        </template>
      </i18n-t>
      <template v-if="record.deviceName"> at {{ record.deviceName }}</template>.
    </p>

    <label class="field">
      <span class="field__label type-label">{{ $t("components.correctionRequest.whatIsWrong") }}</span>
      <BaseSelect
        :model-value="kind"
        :options="correctionKindOptions()"
        @update:model-value="kind = $event as CorrectionRequestKind"
      />
    </label>

    <div v-if="needsTimes" class="field-row">
      <label class="field">
        <span class="field__label type-label">{{ $t("components.correctionRequest.checkInShouldBe") }}</span>
        <BaseTextInput v-model="suggestedEntry" type="time" />
      </label>
      <label class="field">
        <span class="field__label type-label">{{ $t("components.correctionRequest.checkOutShouldBe") }}</span>
        <BaseTextInput v-model="suggestedExit" type="time" />
      </label>
    </div>

    <label class="field">
      <span class="field__label type-label">{{ $t("components.correctionRequest.whatHappened") }}</span>
      <BaseTextarea
        v-model="reason"
        :rows="4"
        :placeholder="$t('components.correctionRequest.reasonPlaceholder')"
      />
      <span class="field__hint type-meta">
        <template v-if="tooShort">
          {{ $t("components.correctionRequest.minimumHint", { count: MIN_CORRECTION_REASON_LENGTH }) }}
        </template>
        <template v-else>{{ $t("common.units.charactersLeft", { count: remaining }) }}</template>
      </span>
    </label>

    <p v-if="localError" class="dialog-warning">{{ localError }}</p>
    <p v-if="errorMessage" class="form-error-banner">{{ errorMessage }}</p>

    <p class="type-meta dialog-footnote">
      {{ $t("components.correctionRequest.footnote") }}
    </p>
  </BaseFormDialog>
</template>

<style scoped>
.record-recap {
  margin: 0 0 var(--space-2);
  padding: var(--space-3);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-elevated);
  font-size: var(--text-sm);
  color: var(--foreground-secondary);
  line-height: var(--leading-normal);
}

.record-recap strong {
  color: var(--foreground);
}

.field {
  display: grid;
  gap: var(--space-2);
}

.field__hint {
  display: block;
}

.field-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
}

.dialog-warning {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: var(--border-width) solid var(--warning-border);
  border-radius: var(--radius-md);
  background: var(--warning-subtle);
  color: var(--warning-foreground);
  font-size: var(--text-sm);
}

.dialog-footnote {
  margin: 0;
  padding-top: var(--space-2);
  border-top: var(--border-width) solid var(--border-subtle);
}
</style>
