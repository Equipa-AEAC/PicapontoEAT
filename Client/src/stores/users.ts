import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { PermissionMatrixRow, UserFormValues, UserSummary } from "../types/users";
import { deactivateUser, getPermissionsMatrix, listUsers, resetUserPassword, saveUser } from "../services/users.service";

export const useUsersStore = defineStore("users", () => {
  const items = ref<UserSummary[]>([]);
  const permissionsMatrix = ref<PermissionMatrixRow[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const passwordResetValue = ref<string | null>(null);

  const administratorCount = computed(() => items.value.filter((user) => user.role === "administrator").length);

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
    try {
      await saveUser(values, userId);
      await loadUsers();
    } finally {
      saving.value = false;
    }
  }

  async function deactivateUserAccount(userId: string) {
    await deactivateUser(userId);
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
    administratorCount,
    loadUsers,
    persistUser,
    deactivateUserAccount,
    resetPassword,
  };
});
