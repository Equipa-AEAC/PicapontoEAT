<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
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
  BaseToggleSwitch,
  BaseToolbar,
} from "../../../../shared/components/base";
import type { BaseTabItem } from "../../../../shared/components/base";
import { useAuthStore } from "../../../../modules/authentication";
import { useMembersStore, useUsersStore } from "../../../../shared/stores";
import { ADMIN_PERMISSIONS, ROLE_PERMISSIONS, effectivePermissions, hasCustomPermissions } from "../../../../types/users";
import type { AdminPermission, UserFormValues, UserRole, UserSummary } from "../../../../types/users";
import { formatTimestamp } from "../../../../shared/utils/date";
import { t } from "../../../../i18n";
import {
  USER_ROLE_ORDER,
  permissionLabel,
  userRoleDescription,
  userRoleLabel,
  userRoleOptions,
} from "../../../../i18n/vocabulary";

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

const form = reactive<UserFormValues>({
  fullName: "",
  email: "",
  role: "viewer",
  status: "active",
  memberId: null,
  permissions: null,
});

/**
 * Whether the dialog is editing permissions directly rather than following the role.
 *
 * The role stays the normal way to describe an account — "a coordinator" is a
 * sentence somebody can act on. This is the escape hatch for the case a preset
 * cannot express: one coordinator who may also create accounts, without minting
 * a fourth tier that means "coordinator plus one thing".
 */
const customPermissions = ref(false);

/** What the role would grant, shown as the baseline the toggles start from. */
const rolePermissions = computed(() => ROLE_PERMISSIONS[form.role]);

/** The set the account would actually have if saved as the dialog now stands. */
const formPermissions = computed(() =>
  effectivePermissions(form.role, customPermissions.value ? form.permissions : null),
);

function permissionEnabled(permission: AdminPermission) {
  return formPermissions.value.includes(permission);
}

function togglePermission(permission: AdminPermission, enabled: boolean) {
  const next = new Set(form.permissions ?? rolePermissions.value);

  if (enabled) {
    next.add(permission);
  } else {
    next.delete(permission);
  }

  form.permissions = ADMIN_PERMISSIONS.filter((item) => next.has(item));
}

/**
 * Turning the override on seeds it from the role, so the first toggle is a
 * change to what the account already had rather than to an empty list.
 */
function setCustomPermissions(enabled: boolean) {
  customPermissions.value = enabled;
  form.permissions = enabled ? [...rolePermissions.value] : null;
}

/**
 * True while `openForm` is filling the form, so the watcher below stays out of it.
 *
 * Without this, opening an account whose permissions differ from its role wiped
 * them: assigning `form.role` fired the rebase, which replaced the account's own
 * list with the role preset before the reader saw it — so a coordinator who had
 * been granted "create accounts" appeared not to have it, and saving would have
 * taken it away.
 */
let loadingForm = false;

/**
 * Changing the role while overriding rebases the list on the new preset.
 *
 * Only when a person changes it. Picking a different role is a statement about
 * what the account should be able to do, so starting again from that role's
 * preset is the useful behaviour; loading a record is not such a statement.
 */
watch(
  () => form.role,
  () => {
    if (customPermissions.value && !loadingForm) {
      form.permissions = [...rolePermissions.value];
    }
  },
);

function permissionsSummary(user: UserSummary): string {
  const granted = effectivePermissions(user.role, user.permissions);

  if (granted.length === 0) {
    return t("admin.users.readOnly");
  }

  return t("admin.users.grantedOfTotal", { granted: granted.length, total: ADMIN_PERMISSIONS.length });
}
const errors = reactive<Partial<Record<keyof UserFormValues, string>>>({});

const tabs = computed<BaseTabItem[]>(() => [
  { value: "accounts", label: t("admin.users.tabAccounts"), icon: PhUserGear, badge: usersStore.items.length },
  { value: "roster", label: t("admin.users.tabRoster"), icon: PhUsersThree, badge: membersWithoutAccount.value.length },
  { value: "permissions", label: t("admin.users.tabPermissions"), icon: PhShieldCheck },
]);

const roleOptions = computed(() => [
  { label: t("common.filters.allRoles"), value: "all" },
  ...userRoleOptions(),
]);

const statusOptions = computed(() => [
  { label: t("common.filters.allStatuses"), value: "all" },
  { label: t("common.state.active"), value: "active" },
  { label: t("common.state.inactive"), value: "inactive" },
]);

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
const roleHint = computed(() => userRoleDescription(form.role));

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key as keyof UserFormValues]);
}

function resetForm() {
  form.fullName = "";
  form.email = "";
  form.role = "viewer";
  form.status = "active";
  form.memberId = null;
  form.permissions = null;
  customPermissions.value = false;
  sendInvite.value = true;
  clearErrors();
}

function openForm(user: UserSummary | null = null) {
  activeUserId.value = user?.id ?? null;
  usersStore.errorMessage = null;

  loadingForm = true;

  if (user) {
    form.fullName = user.fullName;
    form.email = user.email;
    form.role = user.role;
    form.status = user.status;
    form.memberId = user.memberId;
    form.permissions = user.permissions ? [...user.permissions] : null;
    customPermissions.value = user.permissions !== null;
    sendInvite.value = false;
    clearErrors();
  } else {
    resetForm();
  }

  /*
   * The role watcher runs after the reactive assignments above have flushed, so
   * the guard is released on the next tick rather than immediately.
   */
  void nextTick(() => {
    loadingForm = false;
  });

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
    errors.fullName = t("errors.fullNameRequired");
    valid = false;
  } else {
    delete errors.fullName;
  }

  if (!form.email.trim()) {
    errors.email = t("errors.emailRequired");
    valid = false;
  } else if (!emailPattern.test(form.email)) {
    errors.email = t("common.validation.invalidEmail");
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
      :title="$t('admin.users.title')"
      :description="$t('admin.users.description')"
    >
      <template #actions>
        <BaseButton :label="$t('common.actions.refresh')" severity="secondary" outlined :loading="usersStore.loading" @click="usersStore.loadUsers()" />
        <BaseButton
          :label="$t('admin.users.add')"
          :disabled="!canCreate"
          :title="authStore.denialReason('users:create')"
          @click="openForm()"
        />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard :label="$t('admin.users.metricTotal')" :value="String(usersStore.items.length)" :caption="$t('admin.users.metricTotalCaption')" :icon="PhUserGear" />
      <BaseStatsCard :label="$t('admin.users.metricAdmins')" :value="String(usersStore.administratorCount)" :caption="$t('admin.users.metricAdminsCaption')" :icon="PhShieldCheck" />
      <BaseStatsCard :label="$t('admin.users.metricActive')" :value="String(usersStore.items.filter((user) => user.status === 'active').length)" :caption="$t('admin.users.metricActiveCaption')" :icon="PhCheck" />
      <BaseStatsCard :label="$t('admin.users.metricNoAccess')" :value="String(membersWithoutAccount.length)" :caption="$t('admin.users.metricNoAccessCaption')" :icon="PhUsersThree" />
    </section>

    <BaseStatusPill
      v-if="authStore.staffRole && authStore.staffRole !== 'administrator'"
      :label="$t('admin.users.signedInAs', { role: userRoleLabel(authStore.staffRole!) })"
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
              <BaseSearchBar v-model="searchQuery" :placeholder="$t('admin.users.search')" />
              <BaseSelect v-model="roleFilter" :options="roleOptions" />
              <BaseSelect v-model="statusFilter" :options="statusOptions" />
            </div>
          </template>
          <template #right>
            <BaseButton
              :label="
                selectedUsers.length > 0
                  ? $t('admin.users.deactivateSelectedCount', { count: selectedUsers.length })
                  : $t('admin.users.deactivateSelected')
              "
              severity="danger"
              outlined
              :disabled="selectedUsers.length === 0 || !canDeactivate"
              :title="authStore.denialReason('users:deactivate')"
              @click="requestDeactivate(null)"
            />
          </template>
        </BaseToolbar>

        <BaseSection :title="$t('admin.users.tableTitle')" :description="$t('admin.users.tableDescription')">
          <BaseCard>
            <BaseTable v-model:selection="selectedUsers" selectionMode="multiple" :value="visibleUsers" dataKey="id" paginator :rows="8">
              <template #empty>
                <BaseEmptyState :title="$t('admin.users.emptyTitle')" :description="$t('admin.users.emptyDescription')" :action-label="$t('admin.users.add')" @action="openForm()" />
              </template>

              <BaseTableColumn :header="$t('admin.users.colName')" field="fullName" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <strong>{{ slotProps.data.fullName }}</strong>
                    <small>{{ slotProps.data.email }}</small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('common.fields.role')" field="role" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <span>{{ userRoleLabel((slotProps.data as UserSummary).role) }}</span>
                    <small>
                      {{ permissionsSummary(slotProps.data as UserSummary) }}
                      <template v-if="hasCustomPermissions((slotProps.data as UserSummary).role, (slotProps.data as UserSummary).permissions)">
                        · {{ $t("admin.users.customised") }}
                      </template>
                    </small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn field="status" :header="$t('common.fields.status')">
                <template #body="slotProps">
                  <BaseStatusPill
                    :label="
                      slotProps.data.status === 'active'
                        ? $t('common.state.active')
                        : $t('common.state.inactive')
                    "
                    :tone="slotProps.data.status === 'active' ? 'success' : 'warning'"
                  />
                </template>
              </BaseTableColumn>
              <BaseTableColumn field="lastLoginAt" :header="$t('admin.users.colLastLogin')" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <span>{{ formatTimestamp(slotProps.data.lastLoginAt) }}</span>
                    <small>
                      {{
                        slotProps.data.memberId
                          ? $t("admin.users.linkedToMember")
                          : $t("admin.users.staffAccount")
                      }}
                    </small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('common.fields.actions')">
                <template #body="slotProps">
                  <div class="inline-actions">
                    <BaseButton :label="$t('common.actions.edit')" text size="small" :disabled="!canUpdate" :title="authStore.denialReason('users:update')" @click="openForm(slotProps.data)" />
                    <BaseButton :label="$t('admin.users.resetPassword')" text size="small" :disabled="!canResetPassword" :title="authStore.denialReason('users:reset-password')" @click="handleResetPassword(slotProps.data.id)" />
                    <BaseButton
                      v-if="slotProps.data.status === 'active'"
                      :label="$t('admin.users.deactivate')"
                      text
                      severity="danger"
                      size="small"
                      :disabled="!canDeactivate"
                      :title="authStore.denialReason('users:deactivate')"
                      @click="requestDeactivate(slotProps.data.id)"
                    />
                    <BaseButton
                      v-else
                      :label="$t('admin.users.reactivate')"
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

          <BaseCard v-if="usersStore.passwordResetValue" :title="$t('admin.users.tempPasswordTitle')" :description="$t('admin.users.tempPasswordDescription')">
            <div class="module-summary">
              <BaseStatusPill :label="$t('admin.users.tempPasswordGenerated')" tone="success" />
              <p class="temporary-password">{{ usersStore.passwordResetValue }}</p>
              <BaseButton :label="$t('admin.users.dismiss')" severity="secondary" text @click="usersStore.passwordResetValue = null" />
            </div>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- --------------------------------------------------- Roster access -->
      <template #roster>
        <BaseToolbar>
          <template #left>
            <div class="filter-strip">
              <BaseSearchBar v-model="memberSearchQuery" :placeholder="$t('admin.users.rosterSearch')" />
            </div>
          </template>
          <template #right>
            <BaseStatusPill
              :label="$t('admin.users.withoutAccess', { count: membersWithoutAccount.length })"
              :tone="membersWithoutAccount.length > 0 ? 'warning' : 'success'"
            />
          </template>
        </BaseToolbar>

        <BaseSection
          :title="$t('admin.users.rosterTitle')"
          :description="$t('admin.users.rosterDescription')"
        >
          <BaseCard>
            <BaseTable :value="rosterRows" dataKey="id" paginator :rows="10">
              <template #empty>
                <BaseEmptyState :title="$t('admin.users.rosterEmptyTitle')" :description="$t('admin.users.rosterEmptyDescription')" />
              </template>

              <BaseTableColumn :header="$t('admin.users.colMember')" field="fullName" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <strong>{{ slotProps.data.fullName }}</strong>
                    <small>{{ slotProps.data.originSchool }}</small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn field="email" :header="$t('common.fields.email')" sortable />
              <BaseTableColumn :header="$t('admin.users.colAccess')">
                <template #body="slotProps">
                  <BaseStatusPill
                    v-if="slotProps.data.account"
                    :label="
                      $t('admin.users.accountSummary', {
                        role: userRoleLabel(slotProps.data.accountRole),
                        status:
                          slotProps.data.accountStatus === 'active'
                            ? $t('common.state.active')
                            : $t('common.state.inactive'),
                      })
                    "
                    :tone="slotProps.data.accountStatus === 'active' ? 'success' : 'warning'"
                  />
                  <BaseStatusPill v-else :label="$t('admin.users.noAccount')" tone="danger" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('common.fields.actions')" width="200px">
                <template #body="slotProps">
                  <div class="inline-actions">
                    <BaseButton
                      v-if="slotProps.data.account"
                      :label="$t('admin.users.editAccess')"
                      text
                      size="small"
                      :disabled="!canUpdate"
                      :title="authStore.denialReason('users:update')"
                      @click="openForm(slotProps.data.account)"
                    />
                    <BaseButton
                      v-else
                      :label="$t('admin.users.grantAccess')"
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
        <BaseSection :title="$t('admin.users.matrixTitle')" :description="$t('admin.users.matrixDescription')">
          <BaseCard>
            <BaseTable :value="usersStore.permissionsMatrix" dataKey="module" :rows="10">
              <BaseTableColumn field="module" :header="$t('admin.users.colModule')" sortable />
              <BaseTableColumn :header="$t('admin.users.colCreate')">
                <template #body="slotProps">
                  <PhCheck v-if="slotProps.data.create" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('admin.users.colRead')">
                <template #body="slotProps">
                  <PhCheck v-if="slotProps.data.read" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('admin.users.colUpdate')">
                <template #body="slotProps">
                  <PhCheck v-if="slotProps.data.update" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('admin.users.colDelete')">
                <template #body="slotProps">
                  <PhCheck v-if="slotProps.data.delete" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                </template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('admin.users.colExport')">
                <template #body="slotProps">
                  <PhCheck v-if="slotProps.data.export" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>

          <BaseCard :title="$t('admin.users.presetsTitle')" :description="$t('admin.users.presetsDescription')">
            <article v-for="role in USER_ROLE_ORDER" :key="role" class="role-preset">
              <div class="role-preset__head">
                <strong>{{ userRoleLabel(role) }}</strong>
                <BaseStatusPill
                  v-if="authStore.staffRole === role"
                  :label="$t('admin.users.you')"
                  tone="info"
                />
              </div>
              <p class="type-meta">{{ userRoleDescription(role) }}</p>
              <ul class="role-preset__permissions">
                <li v-for="permission in ADMIN_PERMISSIONS" :key="permission" class="role-preset__permission">
                  <PhCheck v-if="ROLE_PERMISSIONS[role].includes(permission)" weight="bold" class="permission-icon permission-icon--yes" />
                  <PhX v-else weight="bold" class="permission-icon permission-icon--no" />
                  <span class="type-meta">{{ permissionLabel(permission) }}</span>
                </li>
              </ul>
            </article>
          </BaseCard>

          <!--
            An override is the thing somebody has to be able to find again. A
            role is discoverable from the preset above; an account that quietly
            differs from its role is not, unless it is listed.
          -->
          <BaseCard
            :title="$t('admin.users.overridesTitle')"
            :description="$t('admin.users.overridesDescription')"
          >
            <BaseEmptyState
              v-if="usersStore.items.filter((user) => hasCustomPermissions(user.role, user.permissions)).length === 0"
              :title="$t('admin.users.overridesEmptyTitle')"
              :description="$t('admin.users.overridesEmptyDescription')"
            />

            <ul v-else class="override-list">
              <li
                v-for="user in usersStore.items.filter((item) => hasCustomPermissions(item.role, item.permissions))"
                :key="user.id"
                class="override-list__row"
              >
                <div class="override-list__main">
                  <span class="override-list__name">{{ user.fullName }}</span>
                  <span class="type-meta">
                    {{
                      $t("admin.users.overrideLine", {
                        role: userRoleLabel(user.role),
                        permissions: effectivePermissions(user.role, user.permissions)
                          .map((permission) => permissionLabel(permission))
                          .join(", "),
                      })
                    }}
                  </span>
                </div>
                <BaseButton
                  :label="$t('common.actions.edit')"
                  text
                  size="small"
                  :disabled="!canUpdate"
                  :title="authStore.denialReason('users:update')"
                  @click="openForm(user)"
                />
              </li>
            </ul>
          </BaseCard>
        </BaseSection>
      </template>
    </BaseTabs>

    <BaseFormDialog
      :visible="formVisible"
      :title="
        activeUserId
          ? $t('admin.users.editAccount')
          : form.memberId
            ? $t('admin.users.grantAccountToMember')
            : $t('admin.users.add')
      "
      :subtitle="$t('admin.users.formSubtitle')"
      :confirm-label="$t('admin.users.save')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="usersStore.saving"
      @update:visible="formVisible = $event"
      @confirm="submitForm"
      @cancel="requestCloseForm"
    >
      <p v-if="usersStore.errorMessage" class="form-error-banner">{{ usersStore.errorMessage }}</p>

      <div class="settings-grid">
        <label>
          <span>{{ $t("admin.users.fieldName") }}</span>
          <BaseTextInput v-model="form.fullName" />
          <small v-if="errors.fullName" class="student-form__error">{{ errors.fullName }}</small>
        </label>
        <label>
          <span>{{ $t("admin.users.fieldEmail") }}</span>
          <BaseTextInput v-model="form.email" type="email" />
          <small v-if="errors.email" class="student-form__error">{{ errors.email }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("admin.users.fieldRole") }}</span>
          <BaseSelect v-model="form.role" :options="roleOptions.slice(1)" />
          <small class="student-form__hint">{{ roleHint }}</small>
        </label>

        <!--
          Permissions are the role's by default and editable on purpose. The
          toggle makes the difference explicit: with it off the account follows
          its role and keeps following it if the role's preset ever changes;
          with it on the account carries its own list.
        -->
        <div class="settings-grid__wide permission-editor">
          <div class="permission-editor__head">
            <div>
              <span class="permission-editor__title">{{ $t("admin.users.permissionsTitle") }}</span>
              <span class="type-meta">
                {{
                  customPermissions
                    ? $t("admin.users.ownList")
                    : $t("admin.users.followingRole", { role: userRoleLabel(form.role) })
                }}
              </span>
            </div>
            <BaseToggleSwitch
              :model-value="customPermissions"
              :aria-label="$t('admin.users.permissionsAria')"
              @update:model-value="setCustomPermissions($event)"
            />
          </div>

          <ul class="permission-editor__list">
            <li v-for="permission in ADMIN_PERMISSIONS" :key="permission" class="permission-editor__row">
              <span class="permission-editor__label">{{ permissionLabel(permission) }}</span>
              <BaseToggleSwitch
                :model-value="permissionEnabled(permission)"
                :disabled="!customPermissions"
                :aria-label="permissionLabel(permission)"
                @update:model-value="togglePermission(permission, $event)"
              />
            </li>
          </ul>

          <p class="type-meta permission-editor__note">
            {{ $t("admin.users.permissionsNote") }}
          </p>
        </div>
        <label>
          <span>{{ $t("admin.users.fieldStatus") }}</span>
          <BaseSelect v-model="form.status" :options="statusOptions.slice(1)" />
        </label>
        <label v-if="!activeUserId">
          <span>{{ $t("admin.users.fieldAccess") }}</span>
          <BaseSelect
            :model-value="sendInvite ? 'invite' : 'later'"
            :options="[
              { label: $t('admin.users.generatePasswordNow'), value: 'invite' },
              { label: $t('admin.users.setPasswordLater'), value: 'later' },
            ]"
            @update:model-value="sendInvite = $event === 'invite'"
          />
          <small class="student-form__hint">{{ $t("admin.users.tempPasswordNote") }}</small>
        </label>
        <div v-if="form.memberId" class="settings-grid__wide user-form__link">
          <BaseStatusPill :label="$t('admin.users.linkedToMember')" tone="info" />
          <span>{{ $t("admin.users.linkedNote") }}</span>
        </div>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="discardConfirmVisible"
      :title="$t('admin.users.discardTitle')"
      :message="$t('admin.users.discardMessage')"
      severity="primary"
      @update:visible="discardConfirmVisible = $event"
      @confirm="confirmDiscard"
      @cancel="discardConfirmVisible = false"
    />

    <BaseConfirmDialog
      :visible="deactivateConfirmVisible"
      :title="$t('admin.users.deactivateTitle')"
      :message="
        selectedUsers.length > 0
          ? $t('admin.users.deactivateSelectedMessage', { count: selectedUsers.length })
          : $t('admin.users.deactivateOneMessage', {
              name: activeUser?.fullName ?? $t('admin.users.thisAccount'),
            })
      "
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
  color: var(--foreground-muted);
}

.permission-editor {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.permission-editor__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.permission-editor__title {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.permission-editor__list,
.override-list,
.role-preset__permissions {
  margin: 0;
  padding: 0;
  list-style: none;
}

.permission-editor__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.permission-editor__row:not(:last-child),
.override-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.permission-editor__label {
  font-size: var(--text-sm);
  color: var(--foreground);
}

.permission-editor__note {
  margin: 0;
}

.role-preset {
  padding: var(--space-3) 0;
}

.role-preset:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

/* The role name arrives written out from the vocabulary, so nothing to transform. */
.role-preset__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.role-preset__permissions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-1) var(--space-4);
  margin-top: var(--space-2);
}

.role-preset__permission {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.override-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.override-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.override-list__name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.temporary-password {
  font-family: "Cascadia Mono", Consolas, monospace;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  color: var(--foreground);
}

.user-form__link {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface-subtle);
  color: var(--foreground-secondary);
  font-size: 0.85rem;
}
</style>
