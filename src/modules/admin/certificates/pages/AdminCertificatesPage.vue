<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { PhBuildings, PhCertificate, PhCheckCircle, PhSealCheck, PhSignature, PhTray } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseFileUpload,
  BaseFormDialog,
  BaseLoading,
  BasePageHeader,
  BaseSearchBar,
  BaseSection,
  BaseSelect,
  BaseStatsCard,
  BaseStatusPill,
  BaseTable,
  BaseTableColumn,
  BaseTabs,
  BaseTextInput,
  BaseTextarea,
  BaseToolbar,
} from "../../../../shared/components/base";
import type { BaseTabItem } from "../../../../shared/components/base";
import { useCertificatesStore } from "../../../../shared/stores";
import type { UploadedFile } from "../../../../services/uploads.service";
import type {
  CertificateRequest,
  CertificateRequestStatus,
  SchoolCertificateProfile,
  SchoolCertificateProfileFormValues,
} from "../../../../types/certificates";
import { CERTIFICATE_REQUEST_STATUS_TONES } from "../../../../types/certificates";
import { formatTimestamp } from "../../../../shared/utils/date";
import { t } from "../../../../i18n";
import { certificateKindLabel, certificateRequestStatusLabel } from "../../../../i18n/vocabulary";

/**
 * Certificate administration.
 *
 * The page was one undifferentiated roster table: every member, both tracks,
 * with Generate buttons next to people who had not asked for anything. Two
 * unrelated jobs — configuring the blank documents and deciding who gets one —
 * were mixed into the same rows, so neither had a place of its own.
 *
 * Three tabs, because there are three jobs:
 *
 *   - **Requests** — the queue. Approving is what generates the document; there
 *     is no separate Generate step, because a certificate produced without a
 *     decision behind it is a file nobody agreed to.
 *   - **School profiles** — FCT templates belong to the school the intern is
 *     *enrolled* at, not to the intern. Equipa Técnica hosts placements from
 *     partner schools and each hands out its own document set, so one profile
 *     serves every intern from that school. A per-student template would be the
 *     same file copied once per person.
 *   - **Surplus template** — ours, standardised, one document for everybody, and
 *     still editable by an administrator.
 */
const certificatesStore = useCertificatesStore();

const activeTab = ref("requests");
const requestSearch = ref("");
const decisionDialogVisible = ref(false);
const decisionRequest = ref<CertificateRequest | null>(null);
const decision = ref<"approved" | "rejected">("approved");
const decisionNote = ref("");

const profileDialogVisible = ref(false);
const editingProfileId = ref<string | null>(null);
const profileForm = reactive<SchoolCertificateProfileFormValues>({
  schoolName: "",
  signatoryName: "",
  signatoryRole: "",
  notes: "",
});
const removeProfileConfirmVisible = ref(false);
const pendingProfileId = ref<string | null>(null);

const statusFilterOptions: Array<{ label: string; value: CertificateRequestStatus | "all" }> = [
  { label: certificateRequestStatusLabel("requested"), value: "requested" },
  { label: certificateRequestStatusLabel("approved"), value: "approved" },
  { label: certificateRequestStatusLabel("rejected"), value: "rejected" },
  { label: t("admin.certificates.allRequests"), value: "all" },
];

const tabs = computed<BaseTabItem[]>(() => [
  { value: "requests", label: t("admin.certificates.tabRequests"), icon: PhTray, badge: certificatesStore.pendingCount },
  {
    value: "schools",
    label: t("admin.certificates.tabSchools"),
    icon: PhBuildings,
    badge: certificatesStore.schoolProfiles.length,
  },
  { value: "surplus", label: t("admin.certificates.tabSurplus"), icon: PhCertificate },
]);

const visibleRequests = computed(() => {
  const query = requestSearch.value.trim().toLowerCase();

  return certificatesStore.requests.filter(
    (request) =>
      query.length === 0 ||
      `${request.memberName} ${request.originSchool}`.toLowerCase().includes(query),
  );
});

const issuedCount = computed(() => certificatesStore.issued.length);

/** Schools with an FCT request on record but no profile to generate from. */
const schoolsWithoutProfile = computed(() => {
  const configured = new Set(
    certificatesStore.schoolProfiles.map((profile) => profile.schoolName.toLowerCase()),
  );

  return [
    ...new Set(
      certificatesStore.requests
        .filter((request) => request.kind === "fct" && !configured.has(request.originSchool.toLowerCase()))
        .map((request) => request.originSchool),
    ),
  ];
});

function certificateFor(request: CertificateRequest) {
  return request.issuedCertificateId
    ? certificatesStore.issued.find((item) => item.id === request.issuedCertificateId) ?? null
    : null;
}

function openDecision(request: CertificateRequest, nextDecision: "approved" | "rejected") {
  certificatesStore.clearMessages();
  decisionRequest.value = request;
  decision.value = nextDecision;
  decisionNote.value = "";
  decisionDialogVisible.value = true;
}

async function submitDecision() {
  if (!decisionRequest.value) {
    return;
  }

  const resolved = await certificatesStore.resolve(decisionRequest.value.id, decision.value, decisionNote.value);

  if (resolved) {
    decisionDialogVisible.value = false;
    decisionRequest.value = null;
  }
}

async function onSurplusTemplateChange(file: UploadedFile | null) {
  if (file) {
    await certificatesStore.uploadTemplate("surplus", file);
  } else {
    await certificatesStore.clearTemplate("surplus");
  }
}

async function onSharedFctTemplateChange(file: UploadedFile | null) {
  if (file) {
    await certificatesStore.uploadTemplate("fct", file);
  } else {
    await certificatesStore.clearTemplate("fct");
  }
}

async function onProfileTemplateChange(profileId: string, file: UploadedFile | null) {
  await certificatesStore.setProfileTemplate(profileId, file);
}

async function onSignedChange(certificateId: string, file: UploadedFile | null) {
  if (file) {
    await certificatesStore.attachSigned(certificateId, file);
  } else {
    await certificatesStore.clearSigned(certificateId);
  }
}

function openProfileDialog(profile: SchoolCertificateProfile | null = null, schoolName = "") {
  certificatesStore.clearMessages();
  editingProfileId.value = profile?.id ?? null;
  profileForm.schoolName = profile?.schoolName ?? schoolName;
  profileForm.signatoryName = profile?.signatoryName ?? "";
  profileForm.signatoryRole = profile?.signatoryRole ?? "";
  profileForm.notes = profile?.notes ?? "";
  profileDialogVisible.value = true;
}

async function submitProfile() {
  const saved = await certificatesStore.saveProfile({ ...profileForm }, editingProfileId.value ?? undefined);

  if (saved) {
    profileDialogVisible.value = false;
    editingProfileId.value = null;
  }
}

function requestRemoveProfile(profileId: string) {
  pendingProfileId.value = profileId;
  removeProfileConfirmVisible.value = true;
}

async function confirmRemoveProfile() {
  if (pendingProfileId.value) {
    await certificatesStore.removeProfile(pendingProfileId.value);
  }

  pendingProfileId.value = null;
  removeProfileConfirmVisible.value = false;
}

function openDownload(url: string) {
  window.open(url, "_blank", "noopener");
}

async function reloadRequests() {
  await certificatesStore.load();
}

onMounted(reloadRequests);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('admin.certificates.title')"
      :description="$t('admin.certificates.description')"
    >
      <template #actions>
        <BaseButton :label="$t('common.actions.refresh')" severity="secondary" outlined :loading="certificatesStore.loading" @click="reloadRequests" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard
        :label="$t('admin.certificates.metricWaiting')"
        :value="String(certificatesStore.pendingCount)"
        :caption="$t('admin.certificates.metricWaitingCaption')"
        :icon="PhTray"
        interactive
        :action-hint="$t('admin.certificates.openRequestQueue')"
        @action="activeTab = 'requests'"
      />
      <BaseStatsCard :label="$t('admin.certificates.metricIssued')" :value="String(issuedCount)" :caption="$t('admin.certificates.metricIssuedCaption')" :icon="PhSealCheck" />
      <BaseStatsCard
        :label="$t('admin.certificates.metricSigned')"
        :value="String(certificatesStore.signedCount)"
        :caption="$t('admin.certificates.metricSignedCaption')"
        :icon="PhSignature"
      />
      <BaseStatsCard
        :label="$t('admin.certificates.metricSchools')"
        :value="String(certificatesStore.schoolProfiles.length)"
        :caption="$t('admin.certificates.metricSchoolsCaption')"
        :icon="PhBuildings"
        interactive
        :action-hint="$t('admin.certificates.openSchoolProfiles')"
        @action="activeTab = 'schools'"
      />
    </section>

    <p v-if="certificatesStore.successMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ certificatesStore.successMessage }}
    </p>
    <p v-if="certificatesStore.errorMessage && !decisionDialogVisible && !profileDialogVisible" class="form-error-banner">
      {{ certificatesStore.errorMessage }}
    </p>

    <BaseLoading v-if="certificatesStore.loading && certificatesStore.requests.length === 0" />

    <BaseTabs v-else v-model="activeTab" :tabs="tabs">
      <!-- ------------------------------------------------------- Requests -->
      <template #requests>
        <BaseToolbar>
          <template #left>
            <div class="filter-strip">
              <BaseSearchBar v-model="requestSearch" :placeholder="$t('admin.certificates.search')" />
              <BaseSelect
                v-model="certificatesStore.requestStatusFilter"
                :options="statusFilterOptions"
                @update:model-value="reloadRequests"
              />
            </div>
          </template>
        </BaseToolbar>

        <!--
          A missing school profile is discovered at approval time otherwise, with
          a refusal and no route out of it. Named here instead, with the fix.
        -->
        <BaseCard
          v-if="schoolsWithoutProfile.length > 0"
          :title="$t('admin.certificates.missingProfileTitle')"
          :description="
            $t('admin.certificates.missingProfileDescription', {
              schools: schoolsWithoutProfile.join(', '),
            })
          "
        >
          <template #footer>
            <BaseButton
              v-for="school in schoolsWithoutProfile"
              :key="school"
              :label="$t('admin.certificates.addProfileFor', { school })"
              severity="secondary"
              outlined
              size="small"
              @click="activeTab = 'schools'; openProfileDialog(null, school)"
            />
          </template>
        </BaseCard>

        <BaseSection
          :title="$t('admin.certificates.requestsTitle')"
          :description="$t('admin.certificates.requestsDescription')"
        >
          <BaseCard>
            <BaseTable :value="visibleRequests" dataKey="id" paginator :rows="8">
              <template #empty>
                <BaseEmptyState
                  :title="$t('admin.certificates.requestsEmptyTitle')"
                  :description="
                    certificatesStore.requestStatusFilter === 'requested'
                      ? $t('admin.certificates.requestsEmptyWaiting')
                      : $t('admin.certificates.requestsEmptyFiltered')
                  "
                />
              </template>

              <BaseTableColumn :header="$t('admin.certificates.colMember')" field="memberName" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <strong>{{ slotProps.data.memberName }}</strong>
                    <small>{{ slotProps.data.originSchool }}</small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.certificates.colCertificate')">
                <template #body="slotProps">
                  <div class="cell-stack">
                    <span>{{ certificateKindLabel((slotProps.data as CertificateRequest).kind) }}</span>
                    <small>
                      {{ $t("admin.certificates.hoursAtRequest", { hours: slotProps.data.hoursAtRequest }) }}
                    </small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.certificates.colAsked')" field="requestedAt" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <span>{{ formatTimestamp(slotProps.data.requestedAt) }}</span>
                    <small v-if="slotProps.data.note">{{ slotProps.data.note }}</small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('common.fields.status')">
                <template #body="slotProps">
                  <div class="cell-stack">
                    <BaseStatusPill
                      :label="certificateRequestStatusLabel((slotProps.data as CertificateRequest).status)"
                      :tone="CERTIFICATE_REQUEST_STATUS_TONES[(slotProps.data as CertificateRequest).status]"
                    />
                    <small v-if="slotProps.data.reviewedBy">
                      {{ slotProps.data.reviewedBy }} · {{ formatTimestamp(slotProps.data.reviewedAt) }}
                    </small>
                    <small v-if="slotProps.data.reviewNote">{{ slotProps.data.reviewNote }}</small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('common.fields.actions')">
                <template #body="slotProps">
                  <div class="certificate-actions">
                    <template v-if="slotProps.data.status === 'requested'">
                      <BaseButton
                        :label="$t('admin.certificates.approveAndGenerate')"
                        text
                        size="small"
                        :loading="certificatesStore.saving"
                        @click="openDecision(slotProps.data, 'approved')"
                      />
                      <BaseButton
                        :label="$t('common.actions.reject')"
                        text
                        size="small"
                        severity="danger"
                        @click="openDecision(slotProps.data, 'rejected')"
                      />
                    </template>

                    <template v-else-if="certificateFor(slotProps.data)">
                      <div class="inline-actions">
                        <BaseButton
                          :label="$t('admin.certificates.open')"
                          text
                          size="small"
                          @click="openDownload(certificateFor(slotProps.data)!.downloadUrl)"
                        />
                        <BaseButton
                          :label="$t('admin.certificates.regenerate')"
                          text
                          size="small"
                          :loading="certificatesStore.saving"
                          @click="certificatesStore.regenerate(certificateFor(slotProps.data)!.id)"
                        />
                      </div>

                      <BaseFileUpload
                        :model-value="certificateFor(slotProps.data)!.signedFile"
                        :upload-label="$t('admin.certificates.uploadSigned')"
                        :hint="$t('admin.certificates.signedHint')"
                        :meta="
                          certificateFor(slotProps.data)!.signedAt
                            ? $t('admin.certificates.signedOn', {
                                date: certificateFor(slotProps.data)!.signedAt!.slice(0, 10),
                              })
                            : ''
                        "
                        :disabled="certificatesStore.saving"
                        @update:model-value="onSignedChange(certificateFor(slotProps.data)!.id, $event)"
                      />
                    </template>

                    <span v-else class="type-meta">{{ $t("admin.certificates.rejectedNote") }}</span>
                  </div>
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- ------------------------------------------------- School profiles -->
      <template #schools>
        <BaseToolbar>
          <template #left>
            <p class="type-body-secondary toolbar-note">
              {{ $t("admin.certificates.schoolsNote") }}
            </p>
          </template>
          <template #right>
            <BaseButton :label="$t('admin.certificates.addSchool')" @click="openProfileDialog()" />
          </template>
        </BaseToolbar>

        <BaseSection
          :title="$t('admin.certificates.profilesTitle')"
          :description="$t('admin.certificates.schoolsDescription')"
        >
          <BaseEmptyState
            v-if="certificatesStore.schoolProfiles.length === 0"
            :title="$t('admin.certificates.noSchoolTitle')"
            :description="$t('admin.certificates.noSchoolDescription')"
            :action-label="$t('admin.certificates.addSchool')"
            @action="openProfileDialog()"
          />

          <div v-else class="dashboard-grid">
            <BaseCard
              v-for="profile in certificatesStore.schoolProfiles"
              :key="profile.id"
              :title="profile.schoolName"
              :description="profile.notes || $t('admin.certificates.noNotes')"
            >
              <template #header>
                <BaseStatusPill
                  :label="
                    profile.template
                      ? $t('admin.certificates.documentUploaded')
                      : $t('admin.certificates.noDocument')
                  "
                  :tone="profile.template ? 'success' : 'warning'"
                />
              </template>

              <dl class="fact-list">
                <div class="fact-list__row">
                  <dt class="type-label">{{ $t("admin.certificates.signedBy") }}</dt>
                  <dd>{{ profile.signatoryName || $t("common.state.notRecorded") }}</dd>
                </div>
                <div class="fact-list__row">
                  <dt class="type-label">{{ $t("admin.certificates.signatoryRole") }}</dt>
                  <dd>{{ profile.signatoryRole || $t("common.state.notRecorded") }}</dd>
                </div>
                <div class="fact-list__row">
                  <dt class="type-label">{{ $t("admin.certificates.updatedAt") }}</dt>
                  <dd>{{ formatTimestamp(profile.updatedAt) }}</dd>
                </div>
              </dl>

              <BaseFileUpload
                :model-value="profile.template"
                :upload-label="$t('admin.certificates.uploadFct')"
                :hint="$t('admin.certificates.letterheadHint')"
                :disabled="certificatesStore.saving"
                @update:model-value="onProfileTemplateChange(profile.id, $event)"
              />

              <template #footer>
                <BaseButton :label="$t('common.actions.edit')" severity="secondary" text @click="openProfileDialog(profile)" />
                <BaseButton :label="$t('common.actions.remove')" severity="danger" text @click="requestRemoveProfile(profile.id)" />
              </template>
            </BaseCard>
          </div>
        </BaseSection>

        <BaseCard
          :title="$t('admin.certificates.sharedTitle')"
          :description="$t('admin.certificates.sharedDescription')"
        >
          <BaseFileUpload
            :model-value="certificatesStore.fctTemplate?.file ?? null"
            :upload-label="$t('admin.certificates.uploadShared')"
            :hint="$t('admin.certificates.letterheadHint')"
            :meta="
                certificatesStore.fctTemplate
                  ? $t('admin.certificates.uploadedOn', {
                      date: certificatesStore.fctTemplate.uploadedAt.slice(0, 10),
                    })
                  : ''
              "
            :disabled="certificatesStore.saving"
            @update:model-value="onSharedFctTemplateChange"
          />
        </BaseCard>
      </template>

      <!-- ------------------------------------------------- Surplus template -->
      <template #surplus>
        <BaseSection
          :title="$t('admin.certificates.surplusTitle')"
          :description="$t('admin.certificates.surplusDescription')"
        >
          <BaseCard
            :title="$t('admin.certificates.templateTitle')"
            :description="$t('admin.certificates.templateDescription')"
          >
            <template #header>
              <BaseStatusPill
                :label="
                  certificatesStore.surplusTemplate
                    ? $t('admin.certificates.configured')
                    : $t('admin.certificates.notConfigured')
                "
                :tone="certificatesStore.surplusTemplate ? 'success' : 'warning'"
              />
            </template>

            <BaseFileUpload
              :model-value="certificatesStore.surplusTemplate?.file ?? null"
              :upload-label="$t('admin.certificates.uploadSurplus')"
              :hint="$t('admin.certificates.letterheadHint')"
              :meta="
                certificatesStore.surplusTemplate
                  ? $t('admin.certificates.uploadedOn', {
                      date: certificatesStore.surplusTemplate.uploadedAt.slice(0, 10),
                    })
                  : ''
              "
              :disabled="certificatesStore.saving"
              @update:model-value="onSurplusTemplateChange"
            />

            <template #footer>
              <p class="type-meta">
                {{ $t("admin.certificates.noTemplateNote") }}
              </p>
            </template>
          </BaseCard>
        </BaseSection>
      </template>
    </BaseTabs>

    <!-- ------------------------------------------------------------ Dialogs -->
    <BaseFormDialog
      :visible="decisionDialogVisible"
      :title="
        decision === 'approved'
          ? $t('admin.certificates.approveAndGenerate')
          : $t('admin.certificates.rejectRequest')
      "
      :subtitle="
        decision === 'approved'
          ? $t('admin.certificates.approveHint')
          : $t('admin.certificates.rejectHint')
      "
      :confirm-label="
        decision === 'approved'
          ? $t('admin.certificates.approveAndGenerate')
          : $t('common.actions.reject')
      "
      :cancel-label="$t('common.actions.cancel')"
      :loading="certificatesStore.saving"
      @update:visible="decisionDialogVisible = $event"
      @confirm="submitDecision"
      @cancel="decisionDialogVisible = false"
    >
      <p v-if="certificatesStore.errorMessage" class="form-error-banner">{{ certificatesStore.errorMessage }}</p>

      <p v-if="decisionRequest" class="type-body-secondary">
        {{
          $t("admin.certificates.decisionSummary", {
            member: decisionRequest.memberName,
            kind: certificateKindLabel(decisionRequest.kind).toLowerCase(),
            hours: decisionRequest.hoursAtRequest,
            school: decisionRequest.originSchool,
          })
        }}
      </p>

      <label class="report-field">
        <span>
          {{
            decision === "rejected"
              ? $t("admin.certificates.noteRequired")
              : $t("admin.certificates.noteOptional")
          }}
        </span>
        <BaseTextarea v-model="decisionNote" rows="3" auto-resize />
      </label>
    </BaseFormDialog>

    <BaseFormDialog
      :visible="profileDialogVisible"
      :title="
        editingProfileId ? $t('admin.certificates.editSchool') : $t('admin.certificates.addSchool')
      "
      :subtitle="$t('admin.certificates.profileSubtitle')"
      :confirm-label="$t('admin.certificates.saveProfile')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="certificatesStore.saving"
      @update:visible="profileDialogVisible = $event"
      @confirm="submitProfile"
      @cancel="profileDialogVisible = false"
    >
      <p v-if="certificatesStore.errorMessage" class="form-error-banner">{{ certificatesStore.errorMessage }}</p>

      <div class="settings-grid">
        <label class="settings-grid__wide">
          <span>{{ $t("admin.certificates.fieldSchool") }}</span>
          <BaseTextInput v-model="profileForm.schoolName" :placeholder="$t('admin.certificates.schoolPlaceholder')" />
        </label>
        <label>
          <span>{{ $t("admin.certificates.signedBy") }}</span>
          <BaseTextInput v-model="profileForm.signatoryName" />
        </label>
        <label>
          <span>{{ $t("admin.certificates.signatoryRole") }}</span>
          <BaseTextInput v-model="profileForm.signatoryRole" :placeholder="$t('admin.certificates.signerPlaceholder')" />
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("common.fields.notes") }}</span>
          <BaseTextarea v-model="profileForm.notes" rows="2" auto-resize />
        </label>
        <p class="settings-grid__wide type-meta">
          {{ $t("admin.certificates.profileUploadNote") }}
        </p>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="removeProfileConfirmVisible"
      :title="$t('admin.certificates.removeProfileTitle')"
      :message="$t('admin.certificates.removeProfileMessage')"
      :confirm-label="$t('common.actions.remove')"
      :cancel-label="$t('common.actions.cancel')"
      severity="danger"
      @update:visible="removeProfileConfirmVisible = $event"
      @confirm="confirmRemoveProfile"
      @cancel="removeProfileConfirmVisible = false"
    />
  </section>
</template>

<style scoped>
.certificate-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  min-width: 220px;
}

.toolbar-note {
  margin: 0;
  max-width: 62ch;
}

.fact-list {
  margin: 0 0 var(--space-4);
  display: flex;
  flex-direction: column;
}

.fact-list__row {
  display: grid;
  grid-template-columns: minmax(80px, 110px) minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.fact-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.fact-list__row dd {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--foreground);
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
