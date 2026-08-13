<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PhCertificate, PhSealCheck, PhSignature, PhTimer } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseDialog,
  BaseEmptyState,
  BaseFileUpload,
  BaseLoading,
  BasePageHeader,
  BaseSearchBar,
  BaseSection,
  BaseSelect,
  BaseStatusPill,
  BaseStatsCard,
  BaseTable,
  BaseTableColumn,
  BaseToolbar,
} from "../../../../shared/components/base";
import { useCertificatesStore, useInternshipsStore, useMembersStore } from "../../../../shared/stores";
import type { UploadedFile } from "../../../../services/uploads.service";
import type { CertificateKind } from "../../../../types/certificates";
import type { InternshipSummary } from "../../../../types/internships";

const certificatesStore = useCertificatesStore();
const internshipsStore = useInternshipsStore();
const membersStore = useMembersStore();

const searchQuery = ref("");
const trackFilter = ref<"all" | "surplus-ready" | "fct-ready" | "awaiting-signature">("all");
const previewVisible = ref(false);

const trackOptions = [
  { label: "All members", value: "all" },
  { label: "Surplus eligible", value: "surplus-ready" },
  { label: "FCT eligible", value: "fct-ready" },
  { label: "Awaiting signature", value: "awaiting-signature" },
];

function internshipFor(memberId: string): InternshipSummary | undefined {
  return internshipsStore.items.find((internship) => internship.studentId === memberId);
}

const rows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return membersStore.allMembers
    .map((member) => {
      const internship = internshipFor(member.id);
      const surplus = certificatesStore.certificateFor(member.id, "surplus");
      const fct = certificatesStore.certificateFor(member.id, "fct");

      return {
        id: member.id,
        fullName: member.fullName,
        originSchool: member.originSchool,
        teamHours: member.teamHours,
        isIntern: Boolean(internship),
        internshipStatus: internship?.status ?? null,
        internshipHours: internship?.completedHours ?? 0,
        surplusEligible: member.teamHours > 0,
        fctEligible: internship?.status === "complete",
        surplus,
        fct,
        awaitingSignature: Boolean((surplus && !surplus.signedFile) || (fct && !fct.signedFile)),
      };
    })
    .filter((row) => {
      const matchesQuery = query.length === 0 || `${row.fullName} ${row.originSchool}`.toLowerCase().includes(query);

      if (!matchesQuery) {
        return false;
      }

      if (trackFilter.value === "surplus-ready") return row.surplusEligible;
      if (trackFilter.value === "fct-ready") return row.fctEligible;
      if (trackFilter.value === "awaiting-signature") return row.awaitingSignature;
      return true;
    });
});

const surplusEligible = computed(() => rows.value.filter((row) => row.surplusEligible).length);
const fctEligible = computed(() => rows.value.filter((row) => row.fctEligible).length);
const totalTeamHours = computed(() => rows.value.reduce((total, row) => total + row.teamHours, 0));

const busy = computed(() => certificatesStore.loading || internshipsStore.loading || membersStore.loading);

function templateDate(kind: CertificateKind) {
  const template = certificatesStore.templateFor(kind);
  return template ? `uploaded ${template.uploadedAt.slice(0, 10)}` : "";
}

async function onTemplateChange(kind: CertificateKind, file: UploadedFile | null) {
  if (file) {
    await certificatesStore.uploadTemplate(kind, file);
  } else {
    await certificatesStore.clearTemplate(kind);
  }
}

async function generate(kind: CertificateKind, memberId: string) {
  const result = await certificatesStore.generate(kind, memberId);

  if (result) {
    previewVisible.value = true;
  }
}

async function onSignedChange(certificateId: string, file: UploadedFile | null) {
  if (file) {
    await certificatesStore.attachSigned(certificateId, file);
  } else {
    await certificatesStore.clearSigned(certificateId);
  }
}

function openDownload(url: string) {
  window.open(url, "_blank", "noopener");
}

onMounted(async () => {
  await Promise.all([membersStore.loadAllMembers(), internshipsStore.loadInternships(), certificatesStore.load()]);
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Certificates"
      description="Two independent certificates: the surplus-hours certificate for volunteer team work, and the official FCT certificate for members who completed an internship."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="busy" @click="certificatesStore.load()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Surplus eligible" :value="String(surplusEligible)" caption="Members with registered team hours" :icon="PhCertificate" />
      <BaseStatsCard label="FCT eligible" :value="String(fctEligible)" caption="Internships marked complete" :icon="PhSealCheck" />
      <BaseStatsCard label="Team hours" :value="String(totalTeamHours)" caption="Volunteer hours across the roster" :icon="PhTimer" />
      <BaseStatsCard label="Signed copies" :value="String(certificatesStore.signedCount)" caption="Countersigned PDFs stored" :icon="PhSignature" />
    </section>

    <p v-if="certificatesStore.errorMessage" class="form-error-banner">{{ certificatesStore.errorMessage }}</p>

    <BaseSection
      title="Certificate templates"
      description="The blank letterhead PDF each certificate is generated from. Uploaded once and reused for every member."
    >
      <div class="dashboard-grid">
        <BaseCard title="Surplus-hours template" description="Used for volunteer team-hours certificates.">
          <BaseFileUpload
            :model-value="certificatesStore.surplusTemplate?.file ?? null"
            upload-label="Upload surplus template"
            :meta="templateDate('surplus')"
            :disabled="certificatesStore.saving"
            @update:model-value="onTemplateChange('surplus', $event)"
          />
        </BaseCard>

        <BaseCard title="FCT template" description="Used for the regulated internship completion certificate.">
          <BaseFileUpload
            :model-value="certificatesStore.fctTemplate?.file ?? null"
            upload-label="Upload FCT template"
            :meta="templateDate('fct')"
            :disabled="certificatesStore.saving"
            @update:model-value="onTemplateChange('fct', $event)"
          />
        </BaseCard>
      </div>
    </BaseSection>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" placeholder="Search members" />
          <BaseSelect v-model="trackFilter" :options="trackOptions" />
        </div>
      </template>
    </BaseToolbar>

    <BaseLoading v-if="busy" />

    <BaseSection v-else title="Certificate registry" description="Every member can earn a surplus-hours certificate; only interns can earn the FCT certificate.">
      <BaseCard>
        <BaseEmptyState
          v-if="!certificatesStore.surplusTemplate && !certificatesStore.fctTemplate"
          title="No template uploaded yet"
          description="Upload a surplus-hours or FCT template above before generating certificates — without one there is no letterhead to generate onto."
        />

        <BaseTable v-else :value="rows" dataKey="id" paginator :rows="8">
          <template #empty>
            <BaseEmptyState title="No members found" description="No member matches the current search." />
          </template>

          <BaseTableColumn header="Member" field="fullName" sortable>
            <template #body="slotProps">
              <div class="cell-stack">
                <strong>{{ slotProps.data.fullName }}</strong>
                <small>{{ slotProps.data.originSchool }}</small>
              </div>
            </template>
          </BaseTableColumn>

          <BaseTableColumn header="Surplus (team hours)">
            <template #body="slotProps">
              <div class="certificate-cell">
                <BaseStatusPill
                  :label="slotProps.data.surplus ? (slotProps.data.surplus.signedFile ? 'Signed' : 'Generated') : slotProps.data.surplusEligible ? `${slotProps.data.teamHours}h available` : 'No hours yet'"
                  :tone="slotProps.data.surplus?.signedFile ? 'success' : slotProps.data.surplus ? 'info' : slotProps.data.surplusEligible ? 'warning' : 'danger'"
                />
                <div class="inline-actions">
                  <BaseButton
                    :label="slotProps.data.surplus ? 'Regenerate' : 'Generate'"
                    text
                    size="small"
                    :disabled="!slotProps.data.surplusEligible || !certificatesStore.surplusTemplate || certificatesStore.saving"
                    @click="generate('surplus', slotProps.data.id)"
                  />
                  <BaseButton v-if="slotProps.data.surplus" label="Open" text size="small" @click="openDownload(slotProps.data.surplus.downloadUrl)" />
                </div>
                <BaseFileUpload
                  v-if="slotProps.data.surplus"
                  :model-value="slotProps.data.surplus.signedFile"
                  upload-label="Upload signed copy"
                  hint="Countersigned PDF · max 5 MB"
                  :meta="slotProps.data.surplus.signedAt ? `signed ${slotProps.data.surplus.signedAt.slice(0, 10)}` : ''"
                  :disabled="certificatesStore.saving"
                  @update:model-value="onSignedChange(slotProps.data.surplus.id, $event)"
                />
              </div>
            </template>
          </BaseTableColumn>

          <BaseTableColumn header="FCT internship">
            <template #body="slotProps">
              <div v-if="slotProps.data.isIntern" class="certificate-cell">
                <BaseStatusPill
                  :label="slotProps.data.fct ? (slotProps.data.fct.signedFile ? 'Signed' : 'Generated') : `${slotProps.data.internshipStatus} · ${slotProps.data.internshipHours}h`"
                  :tone="slotProps.data.fct?.signedFile ? 'success' : slotProps.data.fct ? 'info' : slotProps.data.fctEligible ? 'warning' : 'info'"
                />
                <div class="inline-actions">
                  <BaseButton
                    :label="slotProps.data.fct ? 'Regenerate' : 'Generate'"
                    text
                    size="small"
                    :disabled="!slotProps.data.fctEligible || !certificatesStore.fctTemplate || certificatesStore.saving"
                    @click="generate('fct', slotProps.data.id)"
                  />
                  <BaseButton v-if="slotProps.data.fct" label="Open" text size="small" @click="openDownload(slotProps.data.fct.downloadUrl)" />
                </div>
                <BaseFileUpload
                  v-if="slotProps.data.fct"
                  :model-value="slotProps.data.fct.signedFile"
                  upload-label="Upload signed copy"
                  hint="Countersigned PDF · max 5 MB"
                  :meta="slotProps.data.fct.signedAt ? `signed ${slotProps.data.fct.signedAt.slice(0, 10)}` : ''"
                  :disabled="certificatesStore.saving"
                  @update:model-value="onSignedChange(slotProps.data.fct.id, $event)"
                />
              </div>
              <span v-else class="certificate-cell__muted">Team member only</span>
            </template>
          </BaseTableColumn>
        </BaseTable>
      </BaseCard>
    </BaseSection>

    <BaseDialog
      :visible="previewVisible && Boolean(certificatesStore.lastGenerated)"
      header="Certificate generated"
      @update:visible="previewVisible = $event"
    >
      <div v-if="certificatesStore.lastGenerated" class="module-summary">
        <BaseStatusPill :label="certificatesStore.lastGenerated.kind === 'surplus' ? 'Surplus hours' : 'FCT internship'" tone="success" />
        <p><strong>Member:</strong> {{ certificatesStore.lastGenerated.memberName }}</p>
        <p><strong>Hours:</strong> {{ certificatesStore.lastGenerated.hours }}h</p>
        <p><strong>Generated from:</strong> {{ certificatesStore.lastGenerated.templateFileName }}</p>
        <p><strong>Generated at:</strong> {{ certificatesStore.lastGenerated.generatedAt }}</p>
        <p>{{ certificatesStore.lastGenerated.summary }}</p>
      </div>

      <template #footer>
        <div class="inline-actions inline-actions--end">
          <BaseButton label="Close" severity="secondary" text @click="previewVisible = false" />
          <BaseButton
            v-if="certificatesStore.lastGenerated"
            label="Open file"
            @click="openDownload(certificatesStore.lastGenerated.downloadUrl)"
          />
        </div>
      </template>
    </BaseDialog>
  </section>
</template>

<style scoped>
.certificate-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 220px;
}

.certificate-cell__muted {
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
