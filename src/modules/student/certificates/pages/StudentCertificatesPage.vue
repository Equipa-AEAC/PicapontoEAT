<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PhCheckCircle, PhDownloadSimple } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseErrorState,
  BaseFormDialog,
  BaseLoading,
  BasePageHeader,
  BaseSection,
  BaseStatsCard,
  BaseStatusPill,
  BaseTextarea,
} from "../../../../shared/components/base";
import {
  useCertificatesStore,
  useInternshipsStore,
  useParticipationStore,
} from "../../../../shared/stores";
import type { CertificateKind } from "../../../../shared/types";
import { CERTIFICATE_REQUEST_STATUS_TONES, certificateEligibility } from "../../../../shared/types";
import { formatHours } from "../../../../shared/utils/participation";
import { formatTimestamp } from "../../../../shared/utils/date";
import { useAuthStore } from "../../../../modules/authentication";
import { certificateKindLabel, certificateRequestStatusLabel } from "../../../../i18n/vocabulary";

/**
 * The member's certificates.
 *
 * The page used to offer a "Preview certificate" button on both tracks and
 * nothing else. Pressing it produced a filename, a timestamp and a sentence — no
 * document, no request, no way to obtain one. The FCT card was shown to every
 * member, including those with no placement, disabled with an explanation of why
 * it could not be used.
 *
 * Two rules replaced that:
 *
 *   - **Eligibility decides visibility.** A certificate that does not apply to a
 *     member's participation is absent, not greyed out. A member with no
 *     placement has no FCT requirement to certify, so there is no row for it.
 *   - **Requesting is the action.** The member asks, the coordination team
 *     decides, and approval is what generates the document. There is no preview,
 *     because a preview of something nobody has approved is a picture of a thing
 *     that does not exist.
 */
const authStore = useAuthStore();
const certificatesStore = useCertificatesStore();
const internshipsStore = useInternshipsStore();
const participationStore = useParticipationStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

const requestDialogVisible = ref(false);
const requestKind = ref<CertificateKind>("surplus");
const requestNote = ref("");

const internship = computed(() => internshipsStore.selectedInternship);
const hours = computed(() => participationStore.hours);

/**
 * What this member may ask for.
 *
 * Computed from the same pure function the service validates against, so the
 * page can never offer a certificate the request would be refused for.
 */
const eligibility = computed(() =>
  certificateEligibility({
    teamHours: hours.value?.teamHours ?? 0,
    internshipHours: hours.value?.internshipHours ?? 0,
    internshipStatus: internship.value?.status ?? null,
  }),
);

/** Certificates already generated for this member, ready to download. */
const available = computed(() => certificatesStore.myCertificates);

const answeredRequests = computed(() =>
  certificatesStore.myRequests.filter((request) => request.status !== "requested"),
);

function requestFor(kind: CertificateKind) {
  return certificatesStore.myRequests.find((request) => request.kind === kind && request.status === "requested") ?? null;
}

function openRequest(kind: CertificateKind) {
  certificatesStore.clearMessages();
  requestKind.value = kind;
  requestNote.value = "";
  requestDialogVisible.value = true;
}

async function submitRequest() {
  const created = await certificatesStore.request(memberId.value, requestKind.value, requestNote.value);

  if (created) {
    requestDialogVisible.value = false;
  }
}

function openDownload(url: string) {
  window.open(url, "_blank", "noopener");
}

async function load() {
  await Promise.all([
    certificatesStore.loadForMember(memberId.value),
    internshipsStore.loadInternship(memberId.value),
    participationStore.load(memberId.value),
  ]);
}

onMounted(load);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('student.certificates.title')"
      :description="$t('student.certificates.description')"
    >
      <template #actions>
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="certificatesStore.loading"
          @click="load"
        />
      </template>
    </BasePageHeader>

    <BaseErrorState v-if="participationStore.errorMessage" :message="participationStore.errorMessage" @retry="load" />

    <p v-if="certificatesStore.successMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ certificatesStore.successMessage }}
    </p>
    <p v-if="certificatesStore.errorMessage && !requestDialogVisible" class="form-error-banner">
      {{ certificatesStore.errorMessage }}
    </p>

    <BaseLoading v-if="certificatesStore.loading && available.length === 0 && !hours" />

    <template v-else>
      <!-- The two hour buckets, never added together: they certify different things. -->
      <section class="metric-grid">
        <BaseStatsCard
          :label="$t('student.certificates.metricTeamHours')"
          :value="formatHours(hours?.teamHours ?? 0)"
          :caption="$t('student.certificates.metricTeamHoursCaption')"
        />
        <BaseStatsCard
          v-if="internship"
          :label="$t('student.certificates.metricInternshipHours')"
          :value="formatHours(hours?.internshipHours ?? 0)"
          :caption="$t('student.certificates.metricInternshipHoursCaption')"
        />
        <BaseStatsCard
          :label="$t('student.certificates.metricAvailable')"
          :value="String(available.length)"
          :caption="
            available.length
              ? $t('student.certificates.metricAvailableCaption')
              : $t('student.certificates.metricNothingIssued')
          "
        />
      </section>

      <!-- ------------------------------------------------ Available to ask for -->
      <BaseSection
        :title="$t('student.certificates.availableTitle')"
        :description="$t('student.certificates.availableDescription')"
      >
        <div class="dashboard-grid">
          <BaseCard
            v-for="entry in eligibility"
            :key="entry.kind"
            :title="certificateKindLabel(entry.kind)"
            :description="
              entry.kind === 'surplus'
                ? $t('student.certificates.surplusDescription')
                : $t('student.certificates.fctDescription')
            "
          >
            <div class="certificate-card">
              <p class="certificate-card__hours type-metric">{{ formatHours(entry.hours) }}</p>

              <BaseStatusPill
                v-if="requestFor(entry.kind)"
                :label="$t('student.certificates.waitingForReview')"
                tone="info"
              />
              <BaseStatusPill
                v-else-if="certificatesStore.myCertificateFor(entry.kind)"
                :label="$t('student.certificates.issued')"
                tone="success"
              />
              <BaseStatusPill
                v-else
                :label="
                  entry.eligible ? $t('student.certificates.canRequest') : $t('student.certificates.notYet')
                "
                :tone="entry.eligible ? 'success' : 'warning'"
              />

              <p v-if="!entry.eligible" class="type-meta certificate-card__reason">{{ $t(entry.reasonKey) }}</p>
              <p v-else-if="requestFor(entry.kind)" class="type-meta certificate-card__reason">
                {{
                  $t("student.certificates.sentOn", {
                    time: formatTimestamp(requestFor(entry.kind)!.requestedAt),
                  })
                }}
              </p>
            </div>

            <template #footer>
              <BaseButton
                v-if="entry.eligible && !requestFor(entry.kind)"
                :label="
                  certificatesStore.myCertificateFor(entry.kind)
                    ? $t('student.certificates.requestUpdated')
                    : $t('student.certificates.requestCertificate')
                "
                :loading="certificatesStore.saving"
                @click="openRequest(entry.kind)"
              />
              <span v-else-if="requestFor(entry.kind)" class="type-meta">
                {{ $t("student.certificates.alreadyRequested") }}
              </span>
            </template>
          </BaseCard>
        </div>
      </BaseSection>

      <!-- ----------------------------------------------------------- Issued -->
      <BaseSection
        :title="$t('student.certificates.issuedTitle')"
        :description="$t('student.certificates.issuedDescription')"
      >
        <BaseCard>
          <BaseEmptyState
            v-if="available.length === 0"
            :title="$t('student.certificates.issuedEmptyTitle')"
            :description="$t('student.certificates.issuedEmptyDescription')"
          />

          <ul v-else class="certificate-list">
            <li v-for="certificate in available" :key="certificate.id" class="certificate-list__row">
              <div class="certificate-list__main">
                <span class="certificate-list__title">{{ certificateKindLabel(certificate.kind) }}</span>
                <span class="type-meta">
                  {{
                    $t("student.certificates.issuedOn", {
                      hours: formatHours(certificate.hours),
                      time: formatTimestamp(certificate.generatedAt),
                    })
                  }}
                </span>
                <span v-if="certificate.signedAt" class="type-meta">
                  {{ $t("student.certificates.countersigned", { time: formatTimestamp(certificate.signedAt) }) }}
                </span>
              </div>

              <div class="certificate-list__actions">
                <BaseStatusPill
                  :label="
                    certificate.signedFile
                      ? $t('student.certificates.signed')
                      : $t('student.certificates.issued')
                  "
                  :tone="certificate.signedFile ? 'success' : 'info'"
                />
                <BaseButton severity="secondary" outlined size="small" @click="openDownload(certificate.downloadUrl)">
                  <PhDownloadSimple weight="bold" />
                  {{ $t("common.actions.download") }}
                </BaseButton>
              </div>
            </li>
          </ul>
        </BaseCard>
      </BaseSection>

      <!-- ---------------------------------------------------------- Answered -->
      <BaseCard
        v-if="answeredRequests.length"
        :title="$t('student.certificates.answeredTitle')"
        :description="$t('student.certificates.answeredDescription')"
      >
        <ul class="certificate-list">
          <li v-for="request in answeredRequests" :key="request.id" class="certificate-list__row">
            <div class="certificate-list__main">
              <span class="certificate-list__title">{{ certificateKindLabel(request.kind) }}</span>
              <span class="type-meta">
                {{ request.reviewNote || $t("student.certificates.noNote") }}
              </span>
              <span class="type-meta">
                {{ request.reviewedBy ?? "—" }} · {{ formatTimestamp(request.reviewedAt) }}
              </span>
            </div>
            <BaseStatusPill
              :label="certificateRequestStatusLabel(request.status)"
              :tone="CERTIFICATE_REQUEST_STATUS_TONES[request.status]"
            />
          </li>
        </ul>
      </BaseCard>
    </template>

    <BaseFormDialog
      :visible="requestDialogVisible"
      :title="
        $t('student.certificates.requestTitle', { kind: certificateKindLabel(requestKind).toLocaleLowerCase() })
      "
      :subtitle="$t('student.certificates.requestSubtitle')"
      :confirm-label="$t('student.certificates.requestConfirm')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="certificatesStore.saving"
      @update:visible="requestDialogVisible = $event"
      @confirm="submitRequest"
      @cancel="requestDialogVisible = false"
    >
      <p v-if="certificatesStore.errorMessage" class="form-error-banner">{{ certificatesStore.errorMessage }}</p>

      <p class="type-body-secondary">
        {{
          $t("student.certificates.requestAttests", {
            hours: formatHours(eligibility.find((entry) => entry.kind === requestKind)?.hours ?? 0),
            source:
              requestKind === "surplus"
                ? $t("student.certificates.sourceSurplus")
                : $t("student.certificates.sourceFct"),
          })
        }}
      </p>

      <label class="report-field">
        <span>{{ $t("student.certificates.requestNote") }}</span>
        <BaseTextarea
          v-model="requestNote"
          rows="3"
          auto-resize
          :placeholder="$t('student.certificates.requestNotePlaceholder')"
        />
      </label>
    </BaseFormDialog>
  </section>
</template>

<style scoped>
.certificate-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.certificate-card__hours {
  margin: 0;
}

.certificate-card__reason {
  margin: 0;
}

.certificate-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.certificate-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.certificate-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.certificate-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.certificate-list__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.certificate-list__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  flex: none;
}

.report-field {
  display: block;
}

.report-field > span {
  display: block;
  margin-bottom: var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--foreground-secondary);
}
</style>
