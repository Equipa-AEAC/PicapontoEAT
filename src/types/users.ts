export type UserRole = "administrator" | "coordinator" | "teacher" | "viewer";
export type UserStatus = "active" | "inactive";

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string;
}

export interface UserFormValues {
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface PermissionMatrixRow {
  module: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
}
