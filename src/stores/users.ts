import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { PermissionMatrixRow, UserFormValues, UserSummary } from "../types/users";
import {
  deactivateUser,
  getPermissionsMatrix,
  listUsers,
  reactivateUser,
  resetUserPassword,
  saveUser,
} from "../services/users.service";

export const useUsersStore = defineStore("users", () => {
  const items = ref<UserSummary[]>([]);
  const permissionsMatrix = ref<PermissionMatrixRow[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const passwordResetValue = ref<string | null>(null);
  const errorMessage = ref<string | null>(null);

  const administratorCount = computed(() => items.value.filter((user) => user.role === "administrator").length);

  /** Member ids that already have an account, so the roster can show access status. */
  const linkedMemberIds = computed(
    () => new Set(items.value.map((user) => user.memberId).filter((id): id is string => Boolean(id))),
  );

  function accountForMember(memberId: string) {
    return items.value.find((user) => user.memberId === memberId) ?? null;
  }

  async function loadUsers() {
    loading.value = true;
    try {
      const [users, permissions] = await Promise.all([listUsers(), getPermissionsMatrix()]);
      items.value = users;
      permissionsMatrix.value = permissions;
    } finally {
      loading.value = false;
    }
  }

  async function persistUser(values: UserFormValues, userId?: string) {
    saving.value = true;
    errorMessage.value = null;

    try {
      await saveUser(values, userId);
      await loadUsers();
      return true;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unable to save the account.";
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function deactivateUserAccount(userId: string) {
    await deactivateUser(userId);
    await loadUsers();
  }

  async function reactivateUserAccount(userId: string) {
    await reactivateUser(userId);
    await loadUsers();
  }

  async function resetPassword(userId: string) {
    passwordResetValue.value = (await resetUserPassword(userId)).temporaryPassword;
  }

  return {
    items,
    permissionsMatrix,
    loading,
    saving,
    passwordResetValue,
    errorMessage,
    administratorCount,
    linkedMemberIds,
    accountForMember,
    loadUsers,
    persistUser,
    deactivateUserAccount,
    reactivateUserAccount,
    resetPassword,
  };
});
