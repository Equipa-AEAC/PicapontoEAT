<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Select from "primevue/select";

import {
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseFormDialog,
  BaseLoading,
  BasePageHeader,
  BaseSearchBar,
  BaseSection,
  BaseStatusPill,
  BaseStatsCard,
  BaseTable,
  BaseToolbar,
} from "../../../../shared/components/base";
import { useUsersStore } from "../../../../shared/stores";
import type { UserFormValues, UserSummary } from "../../../../types/users";

const usersStore = useUsersStore();
const searchQuery = ref("");
const roleFilter = ref<"all" | UserSummary["role"]>("all");
const statusFilter = ref<"all" | UserSummary["status"]>("all");
const selectedUsers = ref<UserSummary[]>([]);
const formVisible = ref(false);
const discardConfirmVisible = ref(false);
const deactivateConfirmVisible = ref(false);
const activeUserId = ref<string | null>(null);

const form = reactive<UserFormValues>({ fullName: "", email: "", role: "viewer", status: "active" });
const errors = reactive<Partial<Record<keyof UserFormValues, string>>>({});

const roleOptions = [
  { label: "All roles", value: "all" },
  { label: "Administrator", value: "administrator" },
  { label: "Coordinator", value: "coordinator" },
  { label: "Teacher", value: "teacher" },
  { label: "Viewer", value: "viewer" },
];

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const visibleUsers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return usersStore.items.filter((user) => {
    const matchesQuery = query.length === 0 || [user.fullName, user.email, user.role, user.status].join(" ").toLowerCase().includes(query);
    const matchesRole = roleFilter.value === "all" || user.role === roleFilter.value;
    const matchesStatus = statusFilter.value === "all" || user.status === statusFilter.value;
    return matchesQuery && matchesRole && matchesStatus;
  });
});

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key as keyof UserFormValues]);
}

function resetForm() {
  form.fullName = "";
  form.email = "";
  form.role = "viewer";
  form.status = "active";
  clearErrors();
}

function openForm(user: UserSummary | null = null) {
  activeUserId.value = user?.id ?? null;
  if (user) {
    form.fullName = user.fullName;
    form.email = user.email;
    form.role = user.role;
    form.status = user.status;
  } else {
    resetForm();
  }
  formVisible.value = true;
}

function validateForm() {
  let valid = true;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!form.fullName.trim()) {
    errors.fullName = "Full name is required.";
    valid = false;
  } else {
    delete errors.fullName;
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
    valid = false;
  } else if (!emailPattern.test(form.email)) {
    errors.email = "Enter a valid email address.";
    valid = false;
  } else {
    delete errors.email;
  }

  return valid;
}

async function submitForm() {
  if (!validateForm()) {
    return;
  }

  await usersStore.persistUser({ ...form }, activeUserId.value ?? undefined);
  formVisible.value = false;
  resetForm();
}

function requestCloseForm() {
  discardConfirmVisible.value = true;
}

function confirmDiscard() {
  discardConfirmVisible.value = false;
  formVisible.value = false;
  activeUserId.value = null;
  resetForm();
}

function requestDeactivate(userId: string) {
  activeUserId.value = userId;
  deactivateConfirmVisible.value = true;
}

async function confirmDeactivate() {
  deactivateConfirmVisible.value = false;
  if (selectedUsers.value.length > 0) {
    await Promise.all(selectedUsers.value.map((user) => usersStore.deactivateUserAccount(user.id)));
    selectedUsers.value = [];
    return;
  }

  if (activeUserId.value) {
    await usersStore.deactivateUserAccount(activeUserId.value);
  }
}

async function handleResetPassword(userId: string) {
  await usersStore.resetPassword(userId);
}

onMounted(async () => {
  await usersStore.loadUsers();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Admin workspace"
      title="Users"
      description="Manage administrator and collaborator access across the workspace."
    >
      <template #actions>
        <Button label="Refresh" severity="secondary" outlined :loading="usersStore.loading" @click="usersStore.loadUsers()" />
        <Button label="Add user" @click="openForm()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Total users" :value="String(usersStore.items.length)" caption="Loaded from the mock service" />
      <BaseStatsCard label="Administrators" :value="String(usersStore.administratorCount)" caption="Privileged accounts" />
      <BaseStatsCard label="Active" :value="String(usersStore.items.filter((user) => user.status === 'active').length)" caption="Enabled accounts" />
      <BaseStatsCard label="Selected" :value="String(selectedUsers.length)" caption="Bulk actions target" />
    </section>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" placeholder="Search users" />
          <Select v-model="roleFilter" :options="roleOptions" optionLabel="label" optionValue="value" />
          <Select v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" />
        </div>
      </template>
      <template #right>
        <Button label="Deactivate selected" severity="danger" outlined :disabled="selectedUsers.length === 0" @click="requestDeactivate(selectedUsers[0]?.id ?? '')" />
      </template>
    </BaseToolbar>

    <BaseLoading v-if="usersStore.loading" />

    <BaseSection v-else title="User table" description="Search, select and maintain workspace access records.">
      <BaseCard>
        <BaseTable v-model:selection="selectedUsers" selectionMode="multiple" :value="visibleUsers" dataKey="id" paginator :rows="8">
          <template #empty>
            <BaseEmptyState title="No users found" description="Adjust the filters or create a new user record." action-label="Add user" @action="openForm()" />
          </template>

          <Column selectionMode="multiple" headerStyle="width: 3rem" />
          <Column field="fullName" header="Name" sortable />
          <Column field="email" header="Email" sortable />
          <Column field="role" header="Role" sortable />
          <Column field="status" header="Status">
            <template #body="slotProps">
              <BaseStatusPill :label="slotProps.data.status" :tone="slotProps.data.status === 'active' ? 'success' : 'warning'" />
            </template>
          </Column>
          <Column field="lastLoginAt" header="Last Login" sortable />
          <Column header="Actions">
            <template #body="slotProps">
              <div class="inline-actions">
                <Button label="Edit" text size="small" @click="openForm(slotProps.data)" />
                <Button label="Reset password" text size="small" @click="handleResetPassword(slotProps.data.id)" />
                <Button label="Deactivate" text severity="danger" size="small" @click="requestDeactivate(slotProps.data.id)" />
              </div>
            </template>
          </Column>
        </BaseTable>
      </BaseCard>

      <BaseCard title="Permissions matrix" description="Role capabilities are sourced from the mock service.">
        <BaseTable :value="usersStore.permissionsMatrix" dataKey="module" :rows="5" paginator>
          <Column field="module" header="Module" sortable />
          <Column field="create" header="Create" />
          <Column field="read" header="Read" />
          <Column field="update" header="Update" />
          <Column field="delete" header="Delete" />
          <Column field="export" header="Export" />
        </BaseTable>
      </BaseCard>

      <BaseCard v-if="usersStore.passwordResetValue" title="Password reset result" description="Temporary password generated by the mock service.">
        <BaseStatusPill label="Temporary password generated" tone="success" />
        <p>{{ usersStore.passwordResetValue }}</p>
      </BaseCard>
    </BaseSection>

    <BaseFormDialog
      :visible="formVisible"
      :title="activeUserId ? 'Edit user' : 'Add user'"
      subtitle="Capture the access identity and role assigned to the account."
      confirm-label="Save user"
      :loading="usersStore.saving"
      @update:visible="formVisible = $event"
      @confirm="submitForm"
      @cancel="requestCloseForm"
    >
      <div class="settings-grid">
        <label>
          <span>Full name *</span>
          <InputText v-model="form.fullName" />
          <small v-if="errors.fullName" class="student-form__error">{{ errors.fullName }}</small>
        </label>
        <label>
          <span>Email *</span>
          <InputText v-model="form.email" type="email" />
          <small v-if="errors.email" class="student-form__error">{{ errors.email }}</small>
        </label>
        <label>
          <span>Role *</span>
          <Select v-model="form.role" :options="roleOptions.slice(1)" optionLabel="label" optionValue="value" />
        </label>
        <label>
          <span>Status *</span>
          <Select v-model="form.status" :options="statusOptions.slice(1)" optionLabel="label" optionValue="value" />
        </label>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="discardConfirmVisible"
      title="Discard changes"
      message="Any unsaved user form changes will be lost."
      severity="primary"
      @update:visible="discardConfirmVisible = $event"
      @confirm="confirmDiscard"
      @cancel="discardConfirmVisible = false"
    />

    <BaseConfirmDialog
      :visible="deactivateConfirmVisible"
      title="Deactivate user"
      :message="selectedUsers.length > 0 ? `Deactivate ${selectedUsers.length} selected user(s)?` : 'Deactivate this user account?'"
      :loading="usersStore.saving"
      @update:visible="deactivateConfirmVisible = $event"
      @confirm="confirmDeactivate"
      @cancel="deactivateConfirmVisible = false"
    />
  </section>
</template>