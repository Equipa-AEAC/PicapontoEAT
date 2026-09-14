<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { PhArchive, PhMegaphone, PhNotePencil } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseDialog,
  BaseEmptyState,
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
  BaseTextarea,
  BaseTextInput,
  BaseToolbar,
} from "../../../../shared/components/base";
import type { BaseTabItem } from "../../../../shared/components/base";
import { useAnnouncementsStore, useAuthStore } from "../../../../shared/stores";
import type {
  AnnouncementFormValues,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementSummary,
} from "../../../../types/announcements";
import { formatIsoDate, formatTimestamp } from "../../../../shared/utils/date";
import { announcementAudienceLabel, announcementAudienceOptions, announcementPriorityLabel, announcementPriorityOptions, announcementStatusLabel } from "../../../../i18n/vocabulary";
import { t } from "../../../../i18n";

/**
 * Announcements, organised by where they are in their life rather than by filter.
 *
 * Two problems shaped this.
 *
 * **The primary action was wrong.** "New announcement" opened a form whose
 * Status select defaulted to Draft, so the obvious path — write something, press
 * Save — produced a notice nobody could see, with no indication that it had not
 * been sent. Writing an announcement is almost always writing one to publish, so
 * that is the primary button; "Save as draft" is the deliberate alternative next
 * to it.
 *
 * **Closing the dialog was ambiguous.** A form with a Status field means
 * dismissing it could plausibly mean either "throw this away" or "keep it for
 * later", and the old dialog silently did the former. It now distinguishes the
 * two: leaving with nothing typed simply closes, and leaving with unsaved text
 * asks, offering to keep it as a draft rather than discarding work. Nothing is
 * ever written without somebody choosing to write it.
 *
 * The three tabs are the three states. A published notice, a draft and an
 * archived one are read for different reasons and mixed together they hid each
 * other — the archive in particular grows forever and pushed live notices down.
 */
const announcementsStore = useAnnouncementsStore();
const authStore = useAuthStore();

const activeTab = ref<AnnouncementStatus>("published");
const searchQuery = ref("");
const audienceFilter = ref<"all-audiences" | AnnouncementSummary["audience"]>("all-audiences");

const formDialogVisible = ref(false);
const closeConfirmVisible = ref(false);
const deleteConfirmVisible = ref(false);
const archiveConfirmVisible = ref(false);
const editingAnnouncementId = ref<string | null>(null);
const pendingDeletionId = ref<string | null>(null);
const pendingArchiveId = ref<string | null>(null);

const form = reactive<AnnouncementFormValues>({
  title: "",
  body: "",
  audience: "all",
  priority: "normal",
  status: "draft",
});

const formErrors = reactive<Partial<Record<keyof AnnouncementFormValues, string>>>({});

const audienceFilterOptions = [{ label: t("admin.announcements.allAudiences"), value: "all-audiences" }, ...announcementAudienceOptions()];

const priorityTones: Record<AnnouncementPriority, "info" | "warning" | "danger"> = {
  normal: "info",
  important: "warning",
  urgent: "danger",
};

const statusTones: Record<AnnouncementStatus, "success" | "warning" | "info"> = {
  published: "success",
  draft: "warning",
  archived: "info",
};

function inStatus(status: AnnouncementStatus) {
  const query = searchQuery.value.trim().toLowerCase();

  return announcementsStore.items.filter((announcement) => {
    const matchesStatus = announcement.status === status;
    const matchesQuery =
      query.length === 0 ||
      [announcement.title, announcement.body, announcement.createdBy].join(" ").toLowerCase().includes(query);
    const matchesAudience = audienceFilter.value === "all-audiences" || announcement.audience === audienceFilter.value;

    return matchesStatus && matchesQuery && matchesAudience;
  });
}

const published = computed(() => inStatus("published"));
const drafts = computed(() => inStatus("draft"));
const archived = computed(() => inStatus("archived"));

const tabs = computed<BaseTabItem[]>(() => [
  { value: "published", label: announcementStatusLabel("published"), icon: PhMegaphone, badge: published.value.length },
  { value: "draft", label: t("admin.announcements.drafts"), icon: PhNotePencil, badge: drafts.value.length },
  { value: "archived", label: announcementStatusLabel("archived"), icon: PhArchive, badge: archived.value.length },
]);

const currentRows = computed(() =>
  activeTab.value === "published" ? published.value : activeTab.value === "draft" ? drafts.value : archived.value,
);

const internshipOnlyCount = computed(
  () => announcementsStore.items.filter((item) => item.audience === "official-internship").length,
);

const hasActiveFilters = computed(
  () => searchQuery.value.trim().length > 0 || audienceFilter.value !== "all-audiences",
);

/** Something has been typed that is not on the record yet. */
const hasUnsavedContent = computed(() => form.title.trim().length > 0 || form.body.trim().length > 0);

const dialogTitle = computed(() =>
  editingAnnouncementId.value
    ? t("admin.announcements.editTitle")
    : t("admin.announcements.writeTitle"),
);

function audienceLabel(announcement: AnnouncementSummary) {
  return announcementAudienceLabel(announcement.audience);
}

function priorityLabel(announcement: AnnouncementSummary) {
  return announcementPriorityLabel(announcement.priority);
}

function clearFilters() {
  searchQuery.value = "";
  audienceFilter.value = "all-audiences";
}

function clearErrors() {
  Object.keys(formErrors).forEach((key) => delete formErrors[key as keyof AnnouncementFormValues]);
}

function openCreateDialog() {
  editingAnnouncementId.value = null;
  form.title = "";
  form.body = "";
  form.audience = "all";
  form.priority = "normal";
  form.status = "draft";
  clearErrors();
  formDialogVisible.value = true;
}

function openEditDialog(announcement: AnnouncementSummary) {
  editingAnnouncementId.value = announcement.id;
  form.title = announcement.title;
  form.body = announcement.body;
  form.audience = announcement.audience;
  form.priority = announcement.priority;
  form.status = announcement.status;
  clearErrors();
  formDialogVisible.value = true;
}

function validateForm() {
  let valid = true;

  if (!form.title.trim()) {
    formErrors.title = t("errors.titleRequired");
    valid = false;
  } else {
    delete formErrors.title;
  }

  if (!form.body.trim()) {
    formErrors.body = t("errors.messageRequired");
    valid = false;
  } else {
    delete formErrors.body;
  }

  return valid;
}

/**
 * Save with the status the button names.
 *
 * `status` is no longer a field in the form; it is decided by which button was
 * pressed, which is the only way the two actions can be told apart without the
 * reader having to check a select they did not know mattered.
 */
async function save(status: AnnouncementStatus) {
  if (!validateForm()) {
    return false;
  }

  form.status = status;

  const succeeded = editingAnnouncementId.value
    ? await announcementsStore.editAnnouncement(editingAnnouncementId.value, { ...form })
    : await announcementsStore.addAnnouncement({ ...form }, authStore.currentUser?.fullName ?? "Administrator");

  if (succeeded) {
    formDialogVisible.value = false;
    activeTab.value = status;
  }

  return succeeded;
}

/**
 * Closing the dialog.
 *
 * Nothing typed means nothing to lose, so it just closes — asking would be a
 * confirmation about the empty set. With unsaved text it asks, and the choices
 * are keep-as-draft or discard, never a silent write either way.
 */
function requestClose() {
  if (!hasUnsavedContent.value) {
    formDialogVisible.value = false;
    return;
  }

  closeConfirmVisible.value = true;
}

async function keepAsDraft() {
  closeConfirmVisible.value = false;
  await save("draft");
}

function discardDraft() {
  closeConfirmVisible.value = false;
  formDialogVisible.value = false;
  editingAnnouncementId.value = null;
}

async function publishNow(announcementId: string) {
  await announcementsStore.publish(announcementId);
  activeTab.value = "published";
}

function requestArchive(announcementId: string) {
  pendingArchiveId.value = announcementId;
  archiveConfirmVisible.value = true;
}

async function confirmArchive() {
  if (pendingArchiveId.value) {
    await announcementsStore.archive(pendingArchiveId.value);
  }

  pendingArchiveId.value = null;
  archiveConfirmVisible.value = false;
}

function requestDelete(announcementId: string) {
  pendingDeletionId.value = announcementId;
  deleteConfirmVisible.value = true;
}

async function confirmDelete() {
  if (pendingDeletionId.value) {
    await announcementsStore.remove(pendingDeletionId.value);
  }

  pendingDeletionId.value = null;
  deleteConfirmVisible.value = false;
}

onMounted(async () => {
  await announcementsStore.loadAnnouncements();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('admin.announcements.title')"
      :description="$t('admin.announcements.description')"
    >
      <template #actions>
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="announcementsStore.loading"
          @click="announcementsStore.loadAnnouncements()"
        />
        <BaseButton @click="openCreateDialog()">
          <PhMegaphone weight="bold" />
          {{ $t("admin.announcements.publishTitle") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard
        :label="$t('admin.announcements.metricPublished')"
        :value="String(announcementsStore.publishedCount)"
        :caption="$t('admin.announcements.metricPublishedCaption')"
        :icon="PhMegaphone"
        interactive
        :action-hint="$t('admin.announcements.showPublished')"
        @action="activeTab = 'published'"
      />
      <BaseStatsCard
        :label="$t('admin.announcements.metricDrafts')"
        :value="String(announcementsStore.draftCount)"
        :caption="$t('admin.announcements.metricDraftsCaption')"
        :icon="PhNotePencil"
        interactive
        :action-hint="$t('admin.announcements.showDrafts')"
        @action="activeTab = 'draft'"
      />
      <BaseStatsCard :label="$t('admin.announcements.metricTotal')" :value="String(announcementsStore.items.length)" :caption="$t('admin.announcements.metricTotalCaption')" />
      <BaseStatsCard
        :label="$t('admin.announcements.metricInternship')"
        :value="String(internshipOnlyCount)"
        :caption="$t('admin.announcements.metricInternshipCaption')"
      />
    </section>

    <p v-if="announcementsStore.errorMessage" class="form-error-banner">{{ announcementsStore.errorMessage }}</p>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" :placeholder="$t('admin.announcements.search')" />
          <BaseSelect v-model="audienceFilter" :options="audienceFilterOptions" />
          <BaseButton :label="$t('common.actions.clearFilters')" severity="secondary" outlined :disabled="!hasActiveFilters" @click="clearFilters" />
        </div>
      </template>
    </BaseToolbar>

    <BaseLoading v-if="announcementsStore.loading" />

    <BaseTabs v-else v-model="activeTab" :tabs="tabs">
      <template #[activeTab]>
        <BaseSection
          :title="
            activeTab === 'published'
              ? announcementStatusLabel('published')
              : activeTab === 'draft'
                ? $t('admin.announcements.drafts')
                : announcementStatusLabel('archived')
          "
          :description="
            activeTab === 'published'
              ? $t('admin.announcements.publishedDescription')
              : activeTab === 'draft'
                ? $t('admin.announcements.draftsDescription')
                : $t('admin.announcements.archivedDescription')
          "
        >
          <BaseCard>
            <BaseTable :value="currentRows" dataKey="id" paginator :rows="8">
              <template #empty>
                <BaseEmptyState
                  :title="
                    hasActiveFilters
                      ? $t('admin.announcements.emptyFiltered')
                      : activeTab === 'published'
                        ? $t('admin.announcements.emptyPublished')
                        : activeTab === 'draft'
                          ? $t('admin.announcements.emptyDrafts')
                          : $t('admin.announcements.emptyArchived')
                  "
                  :description="
                    hasActiveFilters
                      ? $t('admin.announcements.emptyFilteredHint')
                      : activeTab === 'published'
                        ? $t('admin.announcements.emptyPublishedHint')
                        : activeTab === 'draft'
                          ? $t('admin.announcements.emptyDraftsHint')
                          : $t('admin.announcements.emptyArchivedHint')
                  "
                  :action-label="
                    hasActiveFilters
                      ? $t('common.actions.clearFilters')
                      : activeTab === 'archived'
                        ? undefined
                        : $t('admin.announcements.publishTitle')
                  "
                  @action="hasActiveFilters ? clearFilters() : openCreateDialog()"
                />
              </template>

              <BaseTableColumn field="title" :header="$t('admin.announcements.colTitle')" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <strong>{{ slotProps.data.title }}</strong>
                    <small>{{ slotProps.data.body }}</small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.announcements.colAudience')">
                <template #body="slotProps">
                  <BaseStatusPill
                    :label="audienceLabel(slotProps.data)"
                    :tone="slotProps.data.audience === 'all' ? 'info' : 'warning'"
                  />
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('common.fields.priority')">
                <template #body="slotProps">
                  <BaseStatusPill
                    :label="priorityLabel(slotProps.data)"
                    :tone="priorityTones[slotProps.data.priority as AnnouncementPriority]"
                  />
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('common.fields.status')">
                <template #body="slotProps">
                  <BaseStatusPill
                    :label="announcementStatusLabel((slotProps.data as AnnouncementSummary).status)"
                    :tone="statusTones[(slotProps.data as AnnouncementSummary).status]"
                  />
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.announcements.colWhen')">
                <template #body="slotProps">
                  <div class="cell-stack">
                    <span>
                      {{
                        slotProps.data.publishedAt
                          ? $t("admin.announcements.publishedOn", {
                              date: formatIsoDate(slotProps.data.publishedAt),
                            })
                          : $t("admin.announcements.neverPublished")
                      }}
                    </span>
                    <small>
                      {{
                        $t("admin.announcements.writtenBy", {
                          when: formatTimestamp(slotProps.data.createdAt),
                          name: slotProps.data.createdBy,
                        })
                      }}
                    </small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('common.fields.actions')">
                <template #body="slotProps">
                  <div class="inline-actions">
                    <!-- The action offered follows the state, rather than showing all four always. -->
                    <BaseButton
                      v-if="slotProps.data.status !== 'archived'"
                      :label="$t('common.actions.edit')"
                      text
                      size="small"
                      @click="openEditDialog(slotProps.data)"
                    />
                    <BaseButton
                      v-if="slotProps.data.status !== 'published'"
                      :label="$t('admin.announcements.publish')"
                      text
                      size="small"
                      @click="publishNow(slotProps.data.id)"
                    />
                    <BaseButton
                      v-if="slotProps.data.status === 'published'"
                      :label="$t('common.actions.archive')"
                      text
                      size="small"
                      @click="requestArchive(slotProps.data.id)"
                    />
                    <BaseButton
                      v-if="slotProps.data.status !== 'published'"
                      :label="$t('common.actions.delete')"
                      text
                      size="small"
                      severity="danger"
                      @click="requestDelete(slotProps.data.id)"
                    />
                  </div>
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>
        </BaseSection>
      </template>
    </BaseTabs>

    <!--
      Not BaseFormDialog: that offers one confirm button, and this workflow has
      two outcomes that are not the same act — publishing reaches people, saving
      a draft reaches nobody.
    -->
    <BaseDialog :visible="formDialogVisible" :header="dialogTitle" @update:visible="$event ? null : requestClose()">
      <p class="dialog-subtitle">{{ $t("admin.announcements.formNote") }}</p>

      <div class="settings-grid">
        <label class="settings-grid__wide">
          <span>{{ $t("admin.announcements.fieldTitle") }}</span>
          <BaseTextInput v-model="form.title" />
          <small v-if="formErrors.title" class="student-form__error">{{ formErrors.title }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("admin.announcements.fieldMessage") }}</span>
          <BaseTextarea v-model="form.body" rows="5" auto-resize />
          <small v-if="formErrors.body" class="student-form__error">{{ formErrors.body }}</small>
        </label>
        <label>
          <span>{{ $t("admin.announcements.fieldAudience") }}</span>
          <BaseSelect v-model="form.audience" :options="announcementAudienceOptions()" />
        </label>
        <label>
          <span>{{ $t("admin.announcements.fieldPriority") }}</span>
          <BaseSelect v-model="form.priority" :options="announcementPriorityOptions()" />
        </label>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <BaseButton :label="$t('common.actions.cancel')" severity="secondary" text @click="requestClose" />
          <BaseButton
            :label="$t('admin.announcements.saveDraft')"
            severity="secondary"
            outlined
            :loading="announcementsStore.saving"
            @click="save('draft')"
          />
          <BaseButton :label="$t('admin.announcements.publish')" :loading="announcementsStore.saving" @click="save('published')" />
        </div>
      </template>
    </BaseDialog>

    <BaseConfirmDialog
      :visible="closeConfirmVisible"
      :title="$t('admin.announcements.keepTitle')"
      :message="$t('admin.announcements.keepMessage')"
      :confirm-label="$t('admin.announcements.keepConfirm')"
      :cancel-label="$t('admin.announcements.keepCancel')"
      severity="primary"
      @update:visible="closeConfirmVisible = $event"
      @confirm="keepAsDraft"
      @cancel="discardDraft"
    />

    <BaseConfirmDialog
      :visible="archiveConfirmVisible"
      :title="$t('admin.announcements.archiveTitle')"
      :message="$t('admin.announcements.archiveMessage')"
      :confirm-label="$t('common.actions.archive')"
      :cancel-label="$t('common.actions.cancel')"
      severity="primary"
      @update:visible="archiveConfirmVisible = $event"
      @confirm="confirmArchive"
      @cancel="archiveConfirmVisible = false"
    />

    <BaseConfirmDialog
      :visible="deleteConfirmVisible"
      :title="$t('admin.announcements.deleteTitle')"
      :message="$t('admin.announcements.deleteMessage')"
      :confirm-label="$t('common.actions.delete')"
      :cancel-label="$t('common.actions.cancel')"
      severity="danger"
      @update:visible="deleteConfirmVisible = $event"
      @confirm="confirmDelete"
      @cancel="deleteConfirmVisible = false"
    />
  </section>
</template>

<style scoped>
.dialog-subtitle {
  margin: 0 0 var(--space-4);
  color: var(--foreground-secondary);
  font-size: var(--text-sm);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
