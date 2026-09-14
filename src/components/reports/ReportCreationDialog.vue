<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { t } from "../../i18n";
import { PhCalendarCheck, PhSealCheck } from "@phosphor-icons/vue";

import BaseButton from "../base/BaseButton.vue";
import BaseDatePicker from "../base/BaseDatePicker.vue";
import BaseDialog from "../base/BaseDialog.vue";
import BaseSelect from "../base/BaseSelect.vue";
import { lastDayOfMonth } from "../../utils/date";

/**
 * Which report to create, and over what period.
 *
 * This replaces a flow that had no beginning. The page offered a month select,
 * a "Generate from journal" button and a separate always-present final-report
 * form, and nothing said which of the two you were making or that they were
 * different documents. Reading it, the monthly balance looked like a filter on
 * the final report.
 *
 * The dialog is two steps because the second question depends on the first: a
 * monthly balance is scoped to a month, a final report to the whole placement.
 * Asking both at once would mean showing fields that do not apply.
 */
export type ReportKind = "monthly" | "final";

export interface MonthlyReportRequest {
  kind: "monthly";
  month: string;
  periodStart: string;
  periodEnd: string;
}

export interface FinalReportRequest {
  kind: "final";
  periodStart: string;
  periodEnd: string;
}

const props = withDefaults(
  defineProps<{
    visible: boolean;
    /** `YYYY-MM` months the student has journal entries for. */
    availableMonths: string[];
    /** Months that already have a report, so the choice does not offer a duplicate. */
    monthsWithReport: string[];
    /** The placement's own dates, used as the final report's default period. */
    internshipStart: string;
    internshipEnd: string;
    /** True once a final report exists in any state other than draft. */
    finalReportLocked: boolean;
    busy?: boolean;
  }>(),
  { busy: false },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  create: [request: MonthlyReportRequest | FinalReportRequest];
}>();

const step = ref<"kind" | "monthly" | "final">("kind");

const monthly = reactive({ month: "", periodStart: "", periodEnd: "" });
const final = reactive({ periodStart: "", periodEnd: "" });

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return;
    }

    step.value = "kind";
    monthly.month = monthOptions.value[0]?.value ?? "";
    applyMonthDefaults();
    final.periodStart = props.internshipStart;
    final.periodEnd = props.internshipEnd;
  },
);

/**
 * Months still open to a new report.
 *
 * A month that already has one is excluded rather than offered and refused: the
 * service rejects a second report for the same month, and a dropdown that leads
 * to an error message is a dropdown that lied.
 */
const monthOptions = computed(() =>
  props.availableMonths
    .filter((month) => !props.monthsWithReport.includes(month))
    .map((month) => ({ label: month, value: month })),
);

/** The default period is the whole month; the student can narrow it. */
function applyMonthDefaults() {
  if (!monthly.month) {
    monthly.periodStart = "";
    monthly.periodEnd = "";
    return;
  }

  monthly.periodStart = `${monthly.month}-01`;
  monthly.periodEnd = lastDayOfMonth(monthly.month);
}

watch(() => monthly.month, applyMonthDefaults);

const monthlyProblem = computed(() => {
  if (!monthly.month) return t("errors.pickMonth");
  if (!monthly.periodStart || !monthly.periodEnd) return t("errors.periodNeedsBothDates");
  if (monthly.periodEnd < monthly.periodStart) return t("errors.endBeforeStart");
  return null;
});

const finalProblem = computed(() => {
  if (!final.periodStart || !final.periodEnd) return t("errors.periodNeedsBothDates");
  if (final.periodEnd < final.periodStart) return t("errors.endBeforeStart");
  return null;
});

function chooseMonthly() {
  step.value = "monthly";
}

function chooseFinal() {
  step.value = "final";
}

function submit() {
  if (step.value === "monthly" && !monthlyProblem.value) {
    emit("create", { kind: "monthly", month: monthly.month, periodStart: monthly.periodStart, periodEnd: monthly.periodEnd });
    return;
  }

  if (step.value === "final" && !finalProblem.value) {
    emit("create", { kind: "final", periodStart: final.periodStart, periodEnd: final.periodEnd });
  }
}
</script>

<template>
  <BaseDialog
    :visible="visible"
    :header="$t('components.reportCreation.header')"
    @update:visible="emit('update:visible', $event)"
  >
    <!-- Step one: which document. The two are not variants of each other. -->
    <template v-if="step === 'kind'">
      <p class="dialog-intro">
        {{ $t("components.reportCreation.intro") }}
      </p>

      <div class="kind-choice">
        <button type="button" class="kind-choice__option" :disabled="monthOptions.length === 0" @click="chooseMonthly">
          <PhCalendarCheck weight="bold" />
          <span class="kind-choice__label">{{ $t("components.reportCreation.monthly") }}</span>
          <span class="kind-choice__hint type-meta">
            {{ $t("components.reportCreation.monthlyDescription") }}
          </span>
          <span v-if="monthOptions.length === 0" class="kind-choice__blocked type-meta">
            {{ $t("components.reportCreation.monthlyExhausted") }}
          </span>
        </button>

        <button type="button" class="kind-choice__option" :disabled="finalReportLocked" @click="chooseFinal">
          <PhSealCheck weight="bold" />
          <span class="kind-choice__label">{{ $t("components.reportCreation.final") }}</span>
          <span class="kind-choice__hint type-meta">
            {{ $t("components.reportCreation.finalDescription") }}
          </span>
          <span v-if="finalReportLocked" class="kind-choice__blocked type-meta">
            {{ $t("components.reportCreation.finalExists") }}
          </span>
        </button>
      </div>
    </template>

    <!-- Step two, monthly: the month, and the period inside it. -->
    <template v-else-if="step === 'monthly'">
      <p class="dialog-intro">
        {{ $t("components.reportCreation.monthlyNote") }}
      </p>

      <div class="settings-grid">
        <label class="settings-grid__wide">
          <span>{{ $t("components.reportCreation.month") }}</span>
          <BaseSelect v-model="monthly.month" :options="monthOptions" :placeholder="$t('components.reportCreation.pickMonth')" />
        </label>

        <label>
          <span>{{ $t("components.reportCreation.periodStarts") }}</span>
          <BaseDatePicker v-model="monthly.periodStart" />
        </label>

        <label>
          <span>{{ $t("components.reportCreation.periodEnds") }}</span>
          <BaseDatePicker v-model="monthly.periodEnd" />
        </label>

        <p class="settings-grid__wide type-meta">
          {{ $t("components.reportCreation.monthHint") }}
        </p>
      </div>

      <p v-if="monthlyProblem" class="type-meta">{{ monthlyProblem }}</p>
    </template>

    <!-- Step two, final: the stretch of the placement the report covers. -->
    <template v-else>
      <p class="dialog-intro">
        {{ $t("components.reportCreation.finalNote") }}
      </p>

      <div class="settings-grid">
        <label>
          <span>{{ $t("components.reportCreation.placementStarts") }}</span>
          <BaseDatePicker v-model="final.periodStart" />
        </label>

        <label>
          <span>{{ $t("components.reportCreation.placementEnds") }}</span>
          <BaseDatePicker v-model="final.periodEnd" />
        </label>

        <p class="settings-grid__wide type-meta">
          {{ $t("components.reportCreation.placementHint") }}
        </p>
      </div>

      <p v-if="finalProblem" class="type-meta">{{ finalProblem }}</p>
    </template>

    <template #footer>
      <div class="dialog-footer">
        <BaseButton
          v-if="step !== 'kind'"
          :label="$t('common.actions.back')"
          severity="secondary"
          text
          @click="step = 'kind'"
        />
        <BaseButton :label="$t('common.actions.cancel')" severity="secondary" text @click="emit('update:visible', false)" />
        <BaseButton
          v-if="step !== 'kind'"
          :label="
            step === 'monthly'
              ? $t('components.reportCreation.generateBalance')
              : $t('components.reportCreation.startFinal')
          "
          :loading="busy"
          :disabled="step === 'monthly' ? monthlyProblem !== null : finalProblem !== null"
          @click="submit"
        />
      </div>
    </template>
  </BaseDialog>
</template>

<style scoped>
.dialog-intro {
  margin: 0 0 var(--space-4);
  color: var(--foreground-secondary);
  font-size: var(--text-sm);
}

.kind-choice {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}

.kind-choice__option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto auto;
  align-items: start;
  gap: var(--space-1) var(--space-3);
  padding: var(--space-4);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
}

.kind-choice__option:hover:not(:disabled) {
  border-color: var(--primary);
  background: var(--hover);
}

.kind-choice__option:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.kind-choice__option svg {
  grid-row: span 3;
  width: 22px;
  height: 22px;
  color: var(--primary);
}

.kind-choice__label {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
}

.kind-choice__hint,
.kind-choice__blocked {
  grid-column: 2;
}

.kind-choice__blocked {
  color: var(--warning);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
