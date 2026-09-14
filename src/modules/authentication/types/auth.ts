import type { AdminPermission, UserRole as StaffRole } from "../../../types/users";

/**
 * Which workspace the session lands in. Deliberately *not* the staff permission
 * tier — a coordinator is still an `administrator` here because they use the admin
 * workspace; what they may do inside it comes from `staffRole` below.
 */
export type UserRole = "administrator" | "student";

export type { StaffRole };

export interface AuthUser {
  /** The account id. Distinct from `memberId` — an account is not a member. */
  id: string;
  fullName: string;
  email: string;
  /**
   * The roster member this account acts as, or null for a staff account with no
   * member record (most administrators).
   *
   * This is the single seam through which member-scoped data is resolved. Every
   * student page reads it from `authStore.currentMemberId` rather than from a
   * constant, so connecting a real session means changing what fills this field
   * and nothing else.
   *
   * BACKEND CONTRACT: the API must issue this from the authenticated session and
   * must not accept it from the client. See docs/ai/BACKEND_CONTRACTS.md.
   */
  memberId: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  role: UserRole;
  /** Permission tier inside the admin workspace. Null for student sessions. */
  staffRole: StaffRole | null;
  /**
   * Permissions granted to this account specifically, or null to follow the role.
   *
   * BACKEND CONTRACT: the server decides this and sends it with the session. It
   * must also enforce it — a permission list the client holds is a description
   * of what the UI should offer, never the thing that stops an action.
   */
  staffPermissions: AdminPermission[] | null;
}

export interface RefreshSessionPayload {
  refreshToken: string;
}