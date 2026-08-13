import type { UserRole as StaffRole } from "../../../types/users";

/**
 * Which workspace the session lands in. Deliberately *not* the staff permission
 * tier — a coordinator is still an `administrator` here because they use the admin
 * workspace; what they may do inside it comes from `staffRole` below.
 */
export type UserRole = "administrator" | "student";

export type { StaffRole };

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
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
}

export interface RefreshSessionPayload {
  refreshToken: string;
}