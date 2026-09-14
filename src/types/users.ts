/*
 * The label maps that used to live here now live in `i18n/vocabulary.ts`.
 *
 * A `Record<Status, string>` is evaluated once at import, which cannot
 * survive a language change. The *values* and their order are still a
 * product decision and stay in this file; how to write them is not.
 */

/**
 * The staff permission tier of an account. Distinct from the workspace role in
 * `modules/authentication/types/auth.ts`, which only decides whether someone lands
 * in the admin or the student workspace — every tier below is an admin-workspace user.
 */
export type UserRole = "administrator" | "coordinator" | "teacher" | "viewer";
export type UserStatus = "active" | "inactive";

/** Actions the admin workspace gates. Kept to what the UI actually checks. */
export type AdminPermission =
  | "users:create"
  | "users:update"
  | "users:reset-password"
  | "users:deactivate"
  | "members:grant-access"
  | "settings:update";

const ALL_PERMISSIONS: AdminPermission[] = [
  "users:create",
  "users:update",
  "users:reset-password",
  "users:deactivate",
  "members:grant-access",
  "settings:update",
];

export const ROLE_PERMISSIONS: Record<UserRole, AdminPermission[]> = {
  administrator: ALL_PERMISSIONS,
  // Coordinators run the roster day to day but cannot mint or retire accounts.
  coordinator: ["users:update", "users:reset-password", "members:grant-access"],
  teacher: [],
  viewer: [],
};

export function roleCan(role: UserRole | null, permission: AdminPermission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}

export const ADMIN_PERMISSIONS: AdminPermission[] = ALL_PERMISSIONS;

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string;
  /** Set when the account was created from a member record on the roster. */
  memberId: string | null;
  /**
   * Permissions granted to this account specifically, or null to follow the role.
   *
   * The role remains the default and the thing most accounts are described by —
   * "a coordinator" is a useful sentence, "an account with four of six
   * permissions" is not. But a role is a preset, not a straitjacket: somebody
   * has to be able to give one coordinator the ability to create accounts
   * without inventing a new tier for them. Null means "whatever the role says",
   * which is what keeps the common case readable.
   */
  permissions: AdminPermission[] | null;
}

export interface UserFormValues {
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  memberId: string | null;
  permissions: AdminPermission[] | null;
}

/**
 * What an account may actually do.
 *
 * One function, used by the session to gate controls and by the Users page to
 * display the effective set, so the list somebody reads and the check the app
 * performs can never disagree.
 */
export function effectivePermissions(
  role: UserRole | null,
  overrides: AdminPermission[] | null | undefined,
): AdminPermission[] {
  if (overrides) {
    return ALL_PERMISSIONS.filter((permission) => overrides.includes(permission));
  }

  return role ? ROLE_PERMISSIONS[role] : [];
}

export function accountCan(
  role: UserRole | null,
  overrides: AdminPermission[] | null | undefined,
  permission: AdminPermission,
): boolean {
  return effectivePermissions(role, overrides).includes(permission);
}

/** True when the account's own list differs from what its role would give it. */
export function hasCustomPermissions(
  role: UserRole,
  overrides: AdminPermission[] | null | undefined,
): boolean {
  if (!overrides) {
    return false;
  }

  const fromRole = ROLE_PERMISSIONS[role];

  return (
    overrides.length !== fromRole.length || overrides.some((permission) => !fromRole.includes(permission))
  );
}

export interface PermissionMatrixRow {
  module: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
}
