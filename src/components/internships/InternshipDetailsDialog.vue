<script setup lang="ts">
import { computed } from "vue";

import BaseButton from "../base/BaseButton.vue";
import BaseDialog from "../base/BaseDialog.vue";
import BaseEmptyState from "../base/BaseEmptyState.vue";
import BaseLoading from "../base/BaseLoading.vue";
import BaseStatusPill from "../base/BaseStatusPill.vue";
import ParticipationTimeline from "../participation/ParticipationTimeline.vue";
import type { InternshipDetails, InternshipStatus } from "../../types/internships";
import type { MemberParticipationHours, ParticipationPeriodHours } from "../../types/participation";
import type { MonthlyReport, FinalReport } from "../../types/internshipReports";
import { REPORT_STATUS_TONES } from "../../types/internshipReports";
import { formatHours } from "../../utils/participation";
import { formatIsoDate, formatTimestamp } from "../../utils/date";
import { internshipStatusLabel, reportStatusLabel } from "../../i18n/vocabulary";

/**
 * One internship, in full, without leaving the list.
 *
 * "Open" used to load the internship into a card appended at the bottom of the
 * page, below the roster table and the assignable-members list — so the reader
 * pressed a button and, as far as they could tell, nothing happened. Everything
 * a reviewer needs is here instead, over the row they clicked.
 *
 * Hours are read-only and derived, as everywhere else: they are summed from the
 * attendance that falls inside this member's internship participation periods.
 * There is deliberately no editable hour field — see
 * `InternshipProgressUpdateValues`.
 */
const props = withDefaults(
  defineProps<{
    visible: boolean;
    internship: InternshipDetails | null;
    /** The school the member is enrolled at, which is not always the host. */
    originSchool: string;
    hours: MemberParticipationHours | null;
    timeline: ParticipationPeriodHours[];
    monthlyReports: MonthlyReport[];
    finalReport: FinalReport | null;
    loading?: boolean;
  }>(),
  { loading: false },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "update-progress": [studentId: string];
  "open-member": [studentId: string];
}>();

function statusTone(status: InternshipStatus) {
  if (status === "complete") return "success";
  if (status === "active") return "info";
  if (status === "paused") return "danger";
  return "warning";
}

const progressPercent = computed(() => {
  const internship = props.internship;

  if (!internship || internship.requiredHours <= 0) {
    return 0;
  }

  return Math.round((internship.completedHours / internship.requiredHours) * 100);
});

/**
 * How far through the placement's calendar we are.
 *
 * Shown beside the hour progress because the pair is the question a reviewer
 * actually has: 40% of the hours at 40% of the time is fine, 40% at 85% is not.
 * Neither number alone says that.
 */
const elapsedPercent = computed(() => {
  const internship = props.internship;

  if (!internship) {
    return null;
  }

  const start = Date.parse(internship.startDate);
  const end = Date.parse(internship.endDate);

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }

  return Math.round(Math.min(Math.max((Date.now() - start) / (end - start), 0), 1) * 100);
});

const submittedReports = computed(() =>
  props.monthlyReports.filter((report) => report.status !== "draft").length,
);
</script>

<template>
  <BaseDialog
    :visible="visible"
    :header="internship ? internship.studentName : $t('components.internshipDetails.header')"
    class="internship-details-dialog"
    @update:visible="emit('update:visible', $event)"
  >
    <BaseLoading v-if="loading" />

    <BaseEmptyState
      v-else-if="!internship"
      :title="$t('components.internshipDetails.unavailableTitle')"
      :description="$t('components.internshipDetails.unavailableDescription')"
    />

    <template v-else>
      <header class="details-head">
        <BaseStatusPill :label="internshipStatusLabel(internship.status)" :tone="statusTone(internship.status)" />
        <span class="type-meta">
          {{ formatIsoDate(internship.startDate) }} – {{ formatIsoDate(internship.endDate) }} at
          {{ internship.hostEntity }}
        </span>
      </header>

      <!-- Hours first: it is the reason the record exists, and it is derived. -->
      <section class="details-block">
        <p class="type-eyebrow details-block__title">{{ $t("components.internshipDetails.progress") }}</p>

        <div class="progress-pair">
          <div>
            <p class="type-label">{{ $t("components.internshipDetails.internshipHours") }}</p>
            <p class="type-metric">{{ progressPercent }}%</p>
            <p class="type-meta">
              {{
                $t("components.internshipDetails.hoursLine", {
                  done: formatHours(internship.completedHours),
                  required: formatHours(internship.requiredHours),
                  remaining: formatHours(internship.remainingHours),
                })
              }}
            </p>
          </div>

          <div v-if="elapsedPercent !== null">
            <p class="type-label">{{ $t("components.internshipDetails.calendarElapsed") }}</p>
            <p class="type-metric">{{ elapsedPercent }}%</p>
            <p class="type-meta">
              {{
                elapsedPercent - progressPercent > 15
                  ? $t("components.internshipDetails.behindPace")
                  : $t("components.internshipDetails.inStep")
              }}
            </p>
          </div>
        </div>

        <p class="type-meta details-note">
          {{ $t("components.internshipDetails.hoursNote") }}
        </p>
      </section>

      <section class="details-block">
        <p class="type-eyebrow details-block__title">{{ $t("components.internshipDetails.placement") }}</p>

        <dl class="fact-list">
          <div class="fact-list__row">
            <dt class="type-label">{{ $t("components.internshipDetails.enrolledAt") }}</dt>
            <dd>{{ originSchool || internship.hostEntity }}</dd>
          </div>
          <div class="fact-list__row">
            <dt class="type-label">{{ $t("components.internshipDetails.orientador") }}</dt>
            <dd>{{ internship.orientador || $t("common.state.notRecorded") }}</dd>
          </div>
          <div class="fact-list__row">
            <dt class="type-label">{{ $t("components.internshipDetails.monitor") }}</dt>
            <dd>{{ internship.monitor || $t("common.state.notRecorded") }}</dd>
          </div>
          <div class="fact-list__row">
            <dt class="type-label">{{ $t("common.fields.notes") }}</dt>
            <dd>{{ internship.notes || $t("common.state.noneRecorded") }}</dd>
          </div>
          <div class="fact-list__row">
            <dt class="type-label">{{ $t("components.internshipDetails.certificate") }}</dt>
            <dd>
              {{
                internship.certificateIssuedAt
                  ? $t("components.internshipDetails.issuedOn", {
                      when: formatTimestamp(internship.certificateIssuedAt),
                    })
                  : $t("components.internshipDetails.notIssued")
              }}
            </dd>
          </div>
        </dl>
      </section>

      <!--
        The participation timeline, not a second hour total. It is what explains
        the figure above — which stretches of attendance counted, and which did not.
      -->
      <section class="details-block">
        <p class="type-eyebrow details-block__title">{{ $t("components.internshipDetails.participationHistory") }}</p>
        <ParticipationTimeline v-if="hours" :hours="hours" :timeline="timeline" />
        <p v-else class="type-meta">{{ $t("components.internshipDetails.noParticipation") }}</p>
      </section>

      <section class="details-block">
        <p class="type-eyebrow details-block__title">
          {{
            $t("components.internshipDetails.reportsHeading", {
              submitted: submittedReports,
              total: monthlyReports.length,
            })
          }}
        </p>

        <BaseEmptyState
          v-if="monthlyReports.length === 0 && !finalReport"
          :title="$t('components.internshipDetails.noReportsTitle')"
          :description="$t('components.internshipDetails.noReportsDescription')"
        />

        <ul v-else class="report-list">
          <li v-for="report in monthlyReports" :key="report.id" class="report-list__row">
            <span class="report-list__label">{{ report.month }}</span>
            <span class="type-meta">
              {{
                $t("components.internshipDetails.entriesAndHours", {
                  entries: report.entriesCount,
                  hours: report.totalHours,
                })
              }}
            </span>
            <BaseStatusPill
              :label="reportStatusLabel(report.status)"
              :tone="REPORT_STATUS_TONES[report.status]"
            />
          </li>
          <li v-if="finalReport" class="report-list__row">
            <span class="report-list__label">{{ $t("components.internshipDetails.finalReport") }}</span>
            <span class="type-meta">{{ $t("components.internshipDetails.finalReportName") }}</span>
            <BaseStatusPill
              :label="reportStatusLabel(finalReport.status)"
              :tone="REPORT_STATUS_TONES[finalReport.status]"
            />
          </li>
        </ul>
      </section>
    </template>

    <template #footer>
      <div class="details-footer">
        <BaseButton :label="$t('common.actions.close')" severity="secondary" text @click="emit('update:visible', false)" />
        <BaseButton
          v-if="internship"
          :label="$t('components.internshipDetails.openMember')"
          severity="secondary"
          outlined
          @click="emit('open-member', internship.studentId)"
        />
        <BaseButton
          v-if="internship"
          :label="$t('components.internshipDetails.updateState')"
          @click="emit('update-progress', internship.studentId)"
        />
      </div>
    </template>
  </BaseDialog>
</template>

<style scoped>
.details-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.details-block:not(:first-of-type) {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: var(--border-width) solid var(--border-subtle);
}

.details-block__title {
  margin: 0 0 var(--space-3);
  color: var(--foreground-secondary);
}

.progress-pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
}

.progress-pair p {
  margin: 0;
}

.details-note {
  margin: var(--space-3) 0 0;
}

.fact-list {
  margin: 0;
  display: flex;
  flex-direction: column;
}

.fact-list__row {
  display: grid;
  grid-template-columns: minmax(120px, 190px) minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.fact-list__row:not(:last-child),
.report-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.fact-list__row dd {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--foreground);
}

.report-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.report-list__row {
  display: grid;
  grid-template-columns: minmax(110px, auto) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.report-list__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.details-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
