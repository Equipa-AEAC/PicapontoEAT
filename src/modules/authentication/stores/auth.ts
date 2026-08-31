import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { loginWithPassword, refreshAuthSession } from "../services/auth.service";
import type { AuthSession, AuthUser, LoginPayload, StaffRole, UserRole } from "../types/auth";
import { roleCan, type AdminPermission } from "../../../types/users";

const AUTH_STORAGE_KEY = "picaponto.auth.session";

interface PersistedAuthState {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  role: UserRole;
  staffRole: StaffRole | null;
}

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const currentUser = ref<AuthUser | null>(null);
  const role = ref<UserRole | null>(null);
  const staffRole = ref<StaffRole | null>(null);
  const loading = ref(false);
  const rememberMe = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value && refreshToken.value && role.value && currentUser.value));

  /**
   * The roster member this session acts as, or null for a staff account that is
   * not on the roster.
   *
   * This is the one place member-scoped data resolves its subject. Nothing else
   * in the frontend should name a member id literally — a page that hardcodes
   * one is a page that shows the wrong person's records the moment sessions
   * become real.
   *
   * BACKEND CONTRACT: today this is filled by the mock auth service from a fixed
   * account→member table, which means it is a *development convenience and not a
   * security boundary*. Anyone can edit it in devtools and read another member's
   * data, because the mock services do no authorization at all. The real API
   * must derive the member from the session token server-side and reject any
   * member id supplied by the client. See docs/ai/BACKEND_CONTRACTS.md.
   */
  const currentMemberId = computed(() => currentUser.value?.memberId ?? null);

  function setSession(session: AuthSession, shouldPersist: boolean) {
    accessToken.value = session.accessToken;
    refreshToken.value = session.refreshToken;
    currentUser.value = session.user;
    role.value = session.role;
    staffRole.value = session.staffRole;
    rememberMe.value = shouldPersist;

    if (shouldPersist) {
      const payload: PersistedAuthState = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
        role: session.role,
        staffRole: session.staffRole,
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
    staffRole.value = null;
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
      // `memberId` is absent from sessions persisted before it existed; treat a
      // missing value as "no member" rather than trusting a stale shape.
      currentUser.value = { ...parsed.user, memberId: parsed.user?.memberId ?? null };
      role.value = parsed.role;
      staffRole.value = parsed.staffRole ?? null;
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

  /** Whether the signed-in staff tier is allowed to perform `permission`. */
  function can(permission: AdminPermission) {
    return roleCan(staffRole.value, permission);
  }

  /** Why an action is unavailable, for a disabled control's tooltip. */
  function denialReason(permission: AdminPermission) {
    if (can(permission)) {
      return "";
    }

    return staffRole.value
      ? `Your ${staffRole.value} role does not allow this action.`
      : "Sign in with a staff account to perform this action.";
  }

  return {
    accessToken,
    refreshToken,
    currentUser,
    role,
    staffRole,
    loading,
    rememberMe,
    isAuthenticated,
    currentMemberId,
    login,
    logout,
    refreshSession,
    hasRole,
    can,
    denialReason,
    rehydrateSession,
  };
});