<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { PhCheck, PhShieldCheck, PhUserGear, PhUsersThree, PhX } from "@phosphor-icons/vue";

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
  BaseStatusPill,
  BaseStatsCard,
  BaseTable,
  BaseTableColumn,
  BaseTabs,
  BaseTextInput,
  BaseToolbar,
} from "../../../../shared/components/base";
import type { BaseTabItem } from "../../../../shared/components/base";
import { useAuthStore } from "../../../../modules/authentication";
import { useMembersStore, useUsersStore } from "../../../../shared/stores";
import { ROLE_DESCRIPTIONS } from "../../../../types/users";
import type { UserFormValues, UserRole, UserSummary } from "../../../../types/users";

const usersStore = useUsersStore();
const membersStore = useMembersStore();
const authStore = useAuthStore();

const activeTab = ref("accounts");
const searchQuery = ref("");
const memberSearchQuery = ref("");
const roleFilter = ref<"all" | UserRole>("all");
const statusFilter = ref<"all" | UserSummary["status"]>("all");
const selectedUsers = ref<UserSummary[]>([]);
const formVisible = ref(false);
const discardConfirmVisible = ref(false);
const deactivateConfirmVisible = ref(false);
const activeUserId = ref<string | null>(null);
const sendInvite = ref(true);

const form = reactive<UserFormValues>({ fullName: "", email: "", role: "viewer", status: "active", memberId: null });
const errors = reactive<Partial<Record<keyof UserFormValues, string>>>({});

const tabs = computed<BaseTabItem[]>(() => [
  { value: "accounts", label: "Accounts", icon: PhUserGear, badge: usersStore.items.length },
  { value: "roster", label: "Roster access", icon: PhUsersThree, badge: membersWithoutAccount.value.length },
  { value: "permissions", label: "Permissions", icon: PhShieldCheck },
]);

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

// Permission gates. Controls stay visible but disabled, with the reason in the
// tooltip — hiding them silently makes the workspace look broken instead of locked.
const canCreate = computed(() => authStore.can("users:create"));
const canUpdate = computed(() => authStore.can("users:update"));
const canResetPassword = computed(() => authStore.can("users:reset-password"));
const canDeactivate = computed(() => authStore.can("users:deactivate"));
const canGrantAccess = computed(() => authStore.can("members:grant-access"));

const visibleUsers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return usersStore.items.filter((user) => {
    const matchesQuery = query.length === 0 || [user.fullName, user.email, user.role, user.status].join(" ").toLowerCase().includes(query);
    const matchesRole = roleFilter.value === "all" || user.role === roleFilter.value;
    const matchesStatus = statusFilter.value === "all" || user.status === statusFilter.value;
    return matchesQuery && matchesRole && matchesStatus;
  });
});

/** The roster with the access each member currently has (or does not have). */
const rosterRows = computed(() => {
  const query = memberSearchQuery.value.trim().toLowerCase();

  return membersStore.allMembers
    .filter((member) => query.length === 0 || `${member.fullName} ${member.email}`.toLowerCase().includes(query))
    .map((member) => {
      const account = usersStore.accountForMember(member.id);

      return {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        originSchool: member.originSchool,
        account,
        accountRole: account?.role ?? null,
        accountStatus: account?.status ?? null,
      };
    });
});

const membersWithoutAccount = computed(() => rosterRows.value.filter((row) => !row.account));

const activeUser = computed(() => usersStore.items.find((user) => user.id === activeUserId.value) ?? null);
const roleHint = computed(() => ROLE_DESCRIPTIONS[form.role]);

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key as keyof UserFormValues]);
}

function resetForm() {
  form.fullName = "";
  form.email = "";
  form.role = "viewer";
  form.status = "active";
  form.memberId = null;
  sendInvite.value = true;
  clearErrors();
}

function openForm(user: UserSummary | null = null) {
  activeUserId.value = user?.id ?? null;
  usersStore.errorMessage = null;

  if (user) {
    form.fullName = user.fullName;
    form.email = user.email;
    form.role = user.role;
    form.status = user.status;
    form.memberId = user.memberId;
    sendInvite.value = false;
    clearErrors();
  } else {
    resetForm();
  }

  formVisible.value = true;
}

/** Grant access to someone already on the roster — the form starts pre-filled. */
function openGrantAccessForm(memberId: string, fullName: string, email: string) {
  activeUserId.value = null;
  usersStore.errorMessage = null;
  resetForm();
  form.fullName = fullName;
  form.email = email;
  form.memberId = memberId;
  form.role = "viewer";
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

  const isCreate = !activeUserId.value;
  const succeeded = await usersStore.persistUser({ ...form }, activeUserId.value ?? undefined);

  if (!succeeded) {
    return;
  }

  // A brand-new account needs a way in; the mock service mints the temporary password.
  if (isCreate && sendInvite.value) {
    const created = usersStore.items.find((user) => user.email.toLowerCase() === form.email.trim().toLowerCase());

    if (created) {
      await usersStore.resetPassword(created.id);
    }
  }

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

function requestDeactivate(userId: string | null) {
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
  await Promise.all([usersStore.loadUsers(), membersStore.loadAllMembers()]);
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Users"
      description="Who can sign in and what they may do. Identity lives on the Members roster; access is granted here."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="usersStore.loading" @click="usersStore.loadUsers()" />
        <BaseButton
          label="Add administrator"
          :disabled="!canCreate"
          :title="authStore.denialReason('users:create')"
          @click="openForm()"
        />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Total accounts" :value="String(usersStore.items.length)" caption="Accounts that can sign in" :icon="PhUserGear" />
      <BaseStatsCard label="Administrators" :value="String(usersStore.administratorCount)" caption="Privileged accounts" :icon="PhShieldCheck" />
      <BaseStatsCard label="Active" :value="String(usersStore.items.filter((user) => user.status === 'active').length)" caption="Enabled accounts" :icon="PhCheck" />
      <BaseStatsCard label="Members without access" :value="String(membersWithoutAccount.length)" caption="On the roster, no sign-in yet" :icon="PhUsersThree" />
    </section>

    <BaseStatusPill
      v-if="authStore.staffRole && authStore.staffRole !== 'administrator'"
      :label="`Signed in as ${authStore.staffRole} — some actions are unavailable`"
      tone="warning"
    />

    <p v-if="usersStore.errorMessage" class="form-error-banner">{{ usersStore.errorMessage }}</p>

    <BaseLoading v-if="usersStore.loading" />

    <BaseTabs v-else v-model="activeTab" :tabs="tabs">
      <!-- ------------------------------------------------------- Accounts -->
      <template #accounts>
        <BaseToolbar>
          <template #left>
            <div class="filter-strip">
              <BaseSearchBar v-model="searchQuery" placeholder="Search accounts" />
              <BaseSelect v-model="roleFilter" :options="roleOptions" />
              <BaseSelect v-model="statusFilter" :options="statusOptions" />
            </div>
          </template>
          <template #right>
            <BaseButton
              :label="selectedUsers.length > 0 ? `Deactivate ${selectedUsers.length} selected` : 'Deactivate selected'"
              severity="danger"
              outlined
              :disabled="selectedUsers.length === 0 || !canDeactivate"
              :title="authStore.denialReason('users:deactivate')"
              @click="requestDeactivate(null)"
            />
          </template>
        </BaseToolbar>

        <BaseSection title="Accounts" description="Search, select and maintain workspace access records.">
          <BaseCard>
            <BaseTable v-model:selection="selectedUsers" selectionMode="multiple" :value="visibleUsers" dataKey="id" paginator :rows="8">
              <template #empty>
                <BaseEmptyState title="No accounts found" description="Adjust the filters or create a new account." action-label="Add administrator" @action="openForm()" />
              </template>

              <BaseTableColumn header="Name" field="fullName" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <strong>{{ slotProps.data.fullName }}</strong>
                    <small>{{ slotProps.data.email }}</small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn header="Role" field="role" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <span>{{ slotProps.data.role }}</span>
                    <small>{{ slotProps.data.memberId ? 'Linked to a member' : 'Staff account' }}</small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn field="status" header="Status">
                <template #body="slotProps">
                  <BaseStatusPill :label="slotProps.data.status" :tone="slotProps.data.status === 'active' ? 'success' : 'warning'" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn field="lastLoginAt" header="Last Login" sortable />
              <BaseTableColumn header="Actions">
                <template #body="slotProps">
                  <div class="inline-actions">
                    <BaseButton label="Edit" text size="small" :disabled="!canUpdate" :title="authStore.denialReason('users:update')" @click="openForm(slotProps.data)" />
                    <BaseButton label="Reset password" text size="small" :disabled="!canResetPassword" :title="authStore.denialReason('users:reset-password')" @click="handleResetPassword(slotProps.data.id)" />
                    <BaseButton
                      v-if="slotProps.data.status === 'active'"
                      label="Deactivate"
                      text
                      severity="danger"
                      size="small"
                      :disabled="!canDeactivate"
                      :title="authStore.denialReason('users:deactivate')"
                      @click="requestDeactivate(slotProps.data.id)"
                    />
                    <BaseButton
                      v-else
                      label="Reactivate"
                      text
                      size="small"
                      :disabled="!canDeactivate"
                      :title="authStore.denialReason('users:deactivate')"
                      @click="usersStore.reactivateUserAccount(slotProps.data.id)"
                    />
                  </div>
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>

          <BaseCard v-if="usersStore.passwordResetValue" title="Temporary password" description="Hand this to the account holder — it is shown once.">
            <div class="module-summary">
              <BaseStatusPill label="Temporary password generated" tone="success" />
              <p class="temporary-password">{{ usersStore.passwordResetValue }}</p>
              <BaseButton label="Dismiss" severity="secondary" text @click="usersStore.passwordResetValue = null" />
            </div>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- --------------------------------------------------- Roster access -->
      <template #roster>
        <BaseToolbar>
          <template #left>
            <div class="filter-strip">
              <BaseSearchBar v-model="memberSearchQuery" placeholder="Search the roster" />
            </div>
          </template>
          <template #right>
            <BaseStatusPill :label="`${membersWithoutAccount.length} without access`" :tone="membersWithoutAccount.length > 0 ? 'warning' : 'success'" />
          </template>
        </BaseToolbar>

        <BaseSection
          title="Roster access"
          description="Every team member and whether they can sign in. Editing who someone is happens on the Members page — this grants and revokes their access."
        >
          <BaseCard>
            <BaseTable :value="rosterRows" dataKey="id" paginator :rows="10">
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
              <BaseTableColumn field="email" header="Email" sortable />
              <BaseTableColumn header="Access">
                <template #body="slotProps">
                  <BaseStatusPill
                    v-if="slotProps.data.account"
                    :label="`${slotProps.data.accountRole} · ${slotProps.data.accountStatus}`"
                    :tone="slotProps.data.accountStatus === 'active' ? 'success' : 'warning'"
                  />
                  <BaseStatusPill v-else label="No account" tone="danger" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn header="Actions" width="200px">
                <template #body="slotProps">
                  <div class="inline-actions">
                    <BaseButton
                      v-if="slotProps.data.account"
                      label="Edit access"
                      text
                      size="small"
                      :disabled="!canUpdate"
                      :title="authStore.denialReason('users:update')"
                      @click="openForm(slotProps.data.account)"
                    />
                    <BaseButton
                      v-else
                      label="Grant access"
                      text
                      size="small"
                      :disabled="!canGrantAccess"
                      :title="authStore.denialReason('members:grant-access')"
                      @click="openGrantAccessForm(slotProps.data.id, slotProps.data.fullName, slotProps.data.email)"
                    />
                  </div>
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- ---------------------------------------------------- Permissions -->
      <template #permissions>
        <BaseSection title="Permissions matrix" description="What each role may do per module. Sourced from the service layer.">
          <BaseCard>
            <BaseTable :value="usersStore.permissionsMatrix" dataKey="module" :rows="10">
              <BaseTableColumn field="module" header="Module" sortable />
              <BaseTableColumn header="Create">
                <template #body="slotProps">
                  <PhCheck v-if="slotProps.data.create" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn header="Read">
                <template #body="slotProps">
                  <PhCheck v-if="slotProps.data.read" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn header="Update">
                <template #body="slotProps">
                  <PhCheck v-if="slotProps.data.update" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn header="Delete">
                <template #body="slotProps">
                  <PhCheck v-if="slotProps.data.delete" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn header="Export">
                <template #body="slotProps">
                  <PhCheck v-if="slotProps.data.export" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>

          <BaseCard title="Role capabilities" description="What each staff tier can do to accounts.">
            <article v-for="(description, role) in ROLE_DESCRIPTIONS" :key="role" class="list-row">
              <div>
                <strong>{{ role }}</strong>
                <p>{{ description }}</p>
              </div>
              <BaseStatusPill v-if="authStore.staffRole === role" label="You" tone="info" />
            </article>
          </BaseCard>
        </BaseSection>
      </template>
    </BaseTabs>

    <BaseFormDialog
      :visible="formVisible"
      :title="activeUserId ? 'Edit account' : form.memberId ? 'Grant access to a member' : 'Add administrator'"
      subtitle="Capture the access identity and the role assigned to the account."
      confirm-label="Save account"
      :loading="usersStore.saving"
      @update:visible="formVisible = $event"
      @confirm="submitForm"
      @cancel="requestCloseForm"
    >
      <p v-if="usersStore.errorMessage" class="form-error-banner">{{ usersStore.errorMessage }}</p>

      <div class="settings-grid">
        <label>
          <span>Full name *</span>
          <BaseTextInput v-model="form.fullName" />
          <small v-if="errors.fullName" class="student-form__error">{{ errors.fullName }}</small>
        </label>
        <label>
          <span>Email *</span>
          <BaseTextInput v-model="form.email" type="email" />
          <small v-if="errors.email" class="student-form__error">{{ errors.email }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>Role *</span>
          <BaseSelect v-model="form.role" :options="roleOptions.slice(1)" />
          <small class="student-form__hint">{{ roleHint }}</small>
        </label>
        <label>
          <span>Status *</span>
          <BaseSelect v-model="form.status" :options="statusOptions.slice(1)" />
        </label>
        <label v-if="!activeUserId">
          <span>Access</span>
          <BaseSelect
            :model-value="sendInvite ? 'invite' : 'later'"
            :options="[
              { label: 'Generate a temporary password now', value: 'invite' },
              { label: 'Set the password later', value: 'later' },
            ]"
            @update:model-value="sendInvite = $event === 'invite'"
          />
          <small class="student-form__hint">The temporary password is shown once after saving.</small>
        </label>
        <div v-if="form.memberId" class="settings-grid__wide user-form__link">
          <BaseStatusPill label="Linked to a roster member" tone="info" />
          <span>This account is tied to their member record, so the roster shows them as having access.</span>
        </div>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="discardConfirmVisible"
      title="Discard changes"
      message="Any unsaved account changes will be lost."
      severity="primary"
      @update:visible="discardConfirmVisible = $event"
      @confirm="confirmDiscard"
      @cancel="discardConfirmVisible = false"
    />

    <BaseConfirmDialog
      :visible="deactivateConfirmVisible"
      title="Deactivate account"
      :message="selectedUsers.length > 0
        ? `Deactivate ${selectedUsers.length} selected account(s)? They will no longer be able to sign in.`
        : `Deactivate ${activeUser?.fullName ?? 'this account'}? They will no longer be able to sign in.`"
      :loading="usersStore.saving"
      @update:visible="deactivateConfirmVisible = $event"
      @confirm="confirmDeactivate"
      @cancel="deactivateConfirmVisible = false"
    />
  </section>
</template>

<style scoped>
.permission-icon {
  width: 17px;
  height: 17px;
}

.permission-icon--yes {
  color: var(--success);
}

.permission-icon--no {
  color: var(--text-muted);
}

.temporary-password {
  font-family: "Cascadia Mono", Consolas, monospace;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

.user-form__link {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 0.85rem;
}
</style>
