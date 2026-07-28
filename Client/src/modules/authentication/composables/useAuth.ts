import { storeToRefs } from "pinia";

import { useAuthStore } from "../stores/auth";

export function useAuth() {
  const authStore = useAuthStore();
  const { accessToken, refreshToken, currentUser, role, isAuthenticated, loading } = storeToRefs(authStore);

  return {
    authStore,
    accessToken,
    refreshToken,
    currentUser,
    role,
    isAuthenticated,
    loading,
  };
}