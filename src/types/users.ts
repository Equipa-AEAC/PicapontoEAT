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

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  administrator: "Full control, including creating and deactivating other accounts.",
  coordinator: "Runs the roster: edit accounts and reset passwords, but cannot create or deactivate them.",
  teacher: "Read-only access to members, attendance and reports.",
  viewer: "Read-only access to reports and dashboards.",
};

export function roleCan(role: UserRole | null, permission: AdminPermission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string;
  /** Set when the account was created from a member record on the roster. */
  memberId: string | null;
}

export interface UserFormValues {
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  memberId: string | null;
}

export interface PermissionMatrixRow {
  module: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
}
