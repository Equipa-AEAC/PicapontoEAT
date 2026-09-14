import type { PermissionMatrixRow, UserFormValues, UserSummary } from "../types/users";
import { ROLE_PERMISSIONS } from "../types/users";

import { appendAuditLog } from "./audit.service";
import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { t } from "../i18n";

export async function listUsers(): Promise<UserSummary[]> {
  return mockRequest(() => cloneRecord(mockDatabase.users));
}

export async function saveUser(values: UserFormValues, userId?: string): Promise<UserSummary> {
  return mockRequest(() => {
    if (userId) {
      const currentUser = mockDatabase.users.find((item) => item.id === userId);

      if (!currentUser) {
        throw new Error(t("errors.userNotFound"));
      }

      Object.assign(currentUser, values);

      appendAuditLog({
        userName: "Administrator",
        action: "UPDATE",
        entity: "user",
        description:
          `${currentUser.fullName} (${currentUser.role})` +
          `${currentUser.permissions ? " with account-specific permissions" : ""}.`,
      });

      return cloneRecord(currentUser);
    }

    if (mockDatabase.users.some((item) => item.email.toLowerCase() === values.email.trim().toLowerCase())) {
      throw new Error(t("errors.accountExists"));
    }

    const createdUser: UserSummary = {
      id: `user-${mockDatabase.users.length + 1}`,
      fullName: values.fullName,
      email: values.email,
      role: values.role,
      status: values.status,
      /*
       * A brand-new account has never signed in. Stamping "now" would claim a
       * login that did not happen, so the field records the moment it was
       * created and the page labels it as such.
       */
      lastLoginAt: new Date().toISOString(),
      memberId: values.memberId,
      permissions: values.permissions,
    };

    mockDatabase.users.unshift(createdUser);

    appendAuditLog({
      userName: "Administrator",
      action: "CREATE",
      entity: "user",
      description: `${createdUser.fullName} (${createdUser.role}) can now sign in.`,
    });

    return cloneRecord(createdUser);
  });
}

export async function deactivateUser(userId: string): Promise<UserSummary> {
  return mockRequest(() => {
    const user = mockDatabase.users.find((item) => item.id === userId);

    if (!user) {
      throw new Error(t("errors.userNotFound"));
    }

    user.status = "inactive";
    return cloneRecord(user);
  });
}

export async function resetUserPassword(userId: string): Promise<{ temporaryPassword: string }> {
  return mockRequest(() => {
    const user = mockDatabase.users.find((item) => item.id === userId);

    if (!user) {
      throw new Error(t("errors.userNotFound"));
    }

    return { temporaryPassword: `Tmp-${user.id.toUpperCase()}-2026` };
  });
}

export async function reactivateUser(userId: string): Promise<UserSummary> {
  return mockRequest(() => {
    const user = mockDatabase.users.find((item) => item.id === userId);

    if (!user) {
      throw new Error(t("errors.userNotFound"));
    }

    user.status = "active";
    return cloneRecord(user);
  });
}

/** What each role grants by default. Read by the Permissions tab. */
export async function getRolePermissions() {
  return mockRequest(() => cloneRecord(ROLE_PERMISSIONS));
}

export async function getPermissionsMatrix(): Promise<PermissionMatrixRow[]> {
  return mockRequest(() => [
    { module: "Members", create: true, read: true, update: true, delete: true, export: true },
    { module: "Attendance", create: true, read: true, update: true, delete: false, export: true },
    { module: "Devices", create: true, read: true, update: true, delete: true, export: false },
    { module: "Reports", create: false, read: true, update: false, delete: false, export: true },
    { module: "Settings", create: false, read: true, update: true, delete: false, export: false },
  ]);
}
