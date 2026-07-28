import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { loginWithPassword, refreshAuthSession } from "../services/auth.service";
import type { AuthSession, AuthUser, LoginPayload, UserRole } from "../types/auth";

const AUTH_STORAGE_KEY = "picaponto.auth.session";

interface PersistedAuthState {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  role: UserRole;
}

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const currentUser = ref<AuthUser | null>(null);
  const role = ref<UserRole | null>(null);
  const loading = ref(false);
  const rememberMe = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value && refreshToken.value && role.value && currentUser.value));

  function setSession(session: AuthSession, shouldPersist: boolean) {
    accessToken.value = session.accessToken;
    refreshToken.value = session.refreshToken;
    currentUser.value = session.user;
    role.value = session.role;
    rememberMe.value = shouldPersist;

    if (shouldPersist) {
      const payload: PersistedAuthState = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
        role: session.role,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
      return;
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function clearSession() {
    accessToken.value = null;
    refreshToken.value = null;
    currentUser.value = null;
    role.value = null;
    rememberMe.value = false;
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function rehydrateSession() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PersistedAuthState;
      accessToken.value = parsed.accessToken;
      refreshToken.value = parsed.refreshToken;
      currentUser.value = parsed.user;
      role.value = parsed.role;
      rememberMe.value = true;
    } catch {
      clearSession();
    }
  }

  async function login(payload: LoginPayload) {
    loading.value = true;
    try {
      const session = await loginWithPassword(payload);
      setSession(session, payload.rememberMe);
      return session;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    clearSession();
  }

  async function refreshSession() {
    if (!refreshToken.value) {
      clearSession();
      return null;
    }

    loading.value = true;
    try {
      const session = await refreshAuthSession({ refreshToken: refreshToken.value });
      setSession(session, rememberMe.value);
      return session;
    } catch {
      clearSession();
      return null;
    } finally {
      loading.value = false;
    }
  }

  function hasRole(expectedRole: UserRole) {
    return role.value === expectedRole;
  }

  return {
    accessToken,
    refreshToken,
    currentUser,
    role,
    loading,
    rememberMe,
    isAuthenticated,
    login,
    logout,
    refreshSession,
    hasRole,
    rehydrateSession,
  };
});