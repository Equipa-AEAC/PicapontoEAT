<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
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
  BaseTextarea,
  BaseTextInput,
  BaseToolbar,
} from "../../../../shared/components/base";
import { useAnnouncementsStore, useAuthStore } from "../../../../shared/stores";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_AUDIENCE_OPTIONS,
  ANNOUNCEMENT_PRIORITY_LABELS,
  ANNOUNCEMENT_PRIORITY_OPTIONS,
  ANNOUNCEMENT_STATUS_OPTIONS,
} from "../../../../types/announcements";
import type { AnnouncementFormValues, AnnouncementPriority, AnnouncementStatus, AnnouncementSummary } from "../../../../types/announcements";

const announcementsStore = useAnnouncementsStore();
const authStore = useAuthStore();

const searchQuery = ref("");
const audienceFilter = ref<"all-audiences" | AnnouncementSummary["audience"]>("all-audiences");
const statusFilter = ref<"all" | AnnouncementStatus>("all");
const formDialogVisible = ref(false);
const deleteConfirmVisible = ref(false);
const editingAnnouncementId = ref<string | null>(null);
const pendingDeletionId = ref<string | null>(null);

const form = reactive<AnnouncementFormValues>({
  title: "",
  body: "",
  audience: "all",
  priority: "normal",
  status: "draft",
});

const formErrors = reactive<Partial<Record<keyof AnnouncementFormValues, string>>>({});

const audienceFilterOptions = [{ label: "All audiences", value: "all-audiences" }, ...ANNOUNCEMENT_AUDIENCE_OPTIONS];
const statusFilterOptions = [{ label: "All statuses", value: "all" }, ...ANNOUNCEMENT_STATUS_OPTIONS];

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

const visibleAnnouncements = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return announcementsStore.items.filter((announcement) => {
    const matchesQuery = query.length === 0 || [announcement.title, announcement.body, announcement.createdBy].join(" ").toLowerCase().includes(query);
    const matchesAudience = audienceFilter.value === "all-audiences" || announcement.audience === audienceFilter.value;
    const matchesStatus = statusFilter.value === "all" || announcement.status === statusFilter.value;
    return matchesQuery && matchesAudience && matchesStatus;
  });
});

const internshipOnlyCount = computed(() => announcementsStore.items.filter((item) => item.audience === "official-internship").length);

const dialogTitle = computed(() => (editingAnnouncementId.value ? "Edit announcement" : "New announcement"));

function audienceLabel(announcement: AnnouncementSummary) {
  return ANNOUNCEMENT_AUDIENCE_LABELS[announcement.audience];
}

function priorityLabel(announcement: AnnouncementSummary) {
  return ANNOUNCEMENT_PRIORITY_LABELS[announcement.priority];
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
    formErrors.title = "Title is required.";
    valid = false;
  } else {
    delete formErrors.title;
  }

  if (!form.body.trim()) {
    formErrors.body = "Message is required.";
    valid = false;
  } else {
    delete formErrors.body;
  }

  return valid;
}

async function submitForm() {
  if (!validateForm()) {
    return;
  }

  const succeeded = editingAnnouncementId.value
    ? await announcementsStore.editAnnouncement(editingAnnouncementId.value, { ...form })
    : await announcementsStore.addAnnouncement({ ...form }, authStore.currentUser?.fullName ?? "Administrator");

  if (succeeded) {
    formDialogVisible.value = false;
  }
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
      title="Announcements"
      description="Write announcements and target them at everyone, at surplus-hours members, or at official interns."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="announcementsStore.loading" @click="announcementsStore.loadAnnouncements()" />
        <BaseButton label="New announcement" @click="openCreateDialog()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Total" :value="String(announcementsStore.items.length)" caption="Announcements on record" />
      <BaseStatsCard label="Published" :value="String(announcementsStore.publishedCount)" caption="Visible to members" />
      <BaseStatsCard label="Drafts" :value="String(announcementsStore.draftCount)" caption="Not published yet" />
      <BaseStatsCard label="Internship only" :value="String(internshipOnlyCount)" caption="Targeted at official interns" />
    </section>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" placeholder="Search announcements" />
          <BaseSelect v-model="audienceFilter" :options="audienceFilterOptions" />
          <BaseSelect v-model="statusFilter" :options="statusFilterOptions" />
        </div>
      </template>
      <template #right>
        <BaseStatusPill :label="`${visibleAnnouncements.length} shown`" tone="info" />
      </template>
    </BaseToolbar>

    <p v-if="announcementsStore.errorMessage" class="form-error-banner">{{ announcementsStore.errorMessage }}</p>

    <BaseLoading v-if="announcementsStore.loading" />

    <BaseSection v-else title="Announcement list" description="Publishing makes an announcement visible to the selected audience.">
      <BaseCard>
        <BaseTable :value="visibleAnnouncements" dataKey="id" paginator :rows="8">
          <template #empty>
            <BaseEmptyState title="No announcements" description="Adjust the filters or write a new announcement." action-label="New announcement" @action="openCreateDialog()" />
          </template>

          <BaseTableColumn field="title" header="Title" sortable />
          <BaseTableColumn header="Audience">
            <template #body="slotProps">
              <BaseStatusPill :label="audienceLabel(slotProps.data)" :tone="slotProps.data.audience === 'all' ? 'info' : 'warning'" />
            </template>
          </BaseTableColumn>
          <BaseTableColumn header="Priority">
            <template #body="slotProps">
              <BaseStatusPill :label="priorityLabel(slotProps.data)" :tone="priorityTones[slotProps.data.priority as AnnouncementPriority]" />
            </template>
          </BaseTableColumn>
          <BaseTableColumn header="Status">
            <template #body="slotProps">
              <BaseStatusPill :label="slotProps.data.status" :tone="statusTones[slotProps.data.status as AnnouncementStatus]" />
            </template>
          </BaseTableColumn>
          <BaseTableColumn field="publishedAt" header="Published" sortable>
            <template #body="slotProps">{{ slotProps.data.publishedAt ?? "—" }}</template>
          </BaseTableColumn>
          <BaseTableColumn field="createdBy" header="Author" sortable />
          <BaseTableColumn header="Actions">
            <template #body="slotProps">
              <div class="inline-actions">
                <BaseButton label="Edit" text size="small" @click="openEditDialog(slotProps.data)" />
                <BaseButton label="Publish" text size="small" :disabled="slotProps.data.status === 'published'" @click="announcementsStore.publish(slotProps.data.id)" />
                <BaseButton label="Archive" text size="small" :disabled="slotProps.data.status === 'archived'" @click="announcementsStore.archive(slotProps.data.id)" />
                <BaseButton label="Delete" text size="small" severity="danger" @click="requestDelete(slotProps.data.id)" />
              </div>
            </template>
          </BaseTableColumn>
        </BaseTable>
      </BaseCard>
    </BaseSection>

    <BaseFormDialog
      :visible="formDialogVisible"
      :title="dialogTitle"
      subtitle="Announcements reach only the audience you select."
      confirm-label="Save"
      :loading="announcementsStore.saving"
      @update:visible="formDialogVisible = $event"
      @confirm="submitForm"
      @cancel="formDialogVisible = false"
    >
      <div class="settings-grid">
        <label class="settings-grid__wide">
          <span>Title *</span>
          <BaseTextInput v-model="form.title" />
          <small v-if="formErrors.title" class="student-form__error">{{ formErrors.title }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>Message *</span>
          <BaseTextarea v-model="form.body" rows="5" auto-resize />
          <small v-if="formErrors.body" class="student-form__error">{{ formErrors.body }}</small>
        </label>
        <label>
          <span>Audience *</span>
          <BaseSelect v-model="form.audience" :options="ANNOUNCEMENT_AUDIENCE_OPTIONS" />
        </label>
        <label>
          <span>Priority *</span>
          <BaseSelect v-model="form.priority" :options="ANNOUNCEMENT_PRIORITY_OPTIONS" />
        </label>
        <label>
          <span>Status *</span>
          <BaseSelect v-model="form.status" :options="ANNOUNCEMENT_STATUS_OPTIONS" />
        </label>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="deleteConfirmVisible"
      title="Delete announcement"
      message="This announcement will be permanently removed."
      severity="danger"
      @update:visible="deleteConfirmVisible = $event"
      @confirm="confirmDelete"
      @cancel="deleteConfirmVisible = false"
    />
  </section>
</template>
