import type { PermissionMatrixRow, UserFormValues, UserSummary } from "../types/users";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";

export async function listUsers(): Promise<UserSummary[]> {
  return mockRequest(() => cloneRecord(mockDatabase.users));
}

export async function saveUser(values: UserFormValues, userId?: string): Promise<UserSummary> {
  return mockRequest(() => {
    if (userId) {
      const currentUser = mockDatabase.users.find((item) => item.id === userId);

      if (!currentUser) {
        throw new Error("User not found.");
      }

      Object.assign(currentUser, values);
      return cloneRecord(currentUser);
    }

    const createdUser: UserSummary = {
      id: `user-${mockDatabase.users.length + 1}`,
      fullName: values.fullName,
      email: values.email,
      role: values.role,
      status: values.status,
      lastLoginAt: new Date().toISOString(),
    };

    mockDatabase.users.unshift(createdUser);
    return cloneRecord(createdUser);
  });
}

export async function deactivateUser(userId: string): Promise<UserSummary> {
  return mockRequest(() => {
    const user = mockDatabase.users.find((item) => item.id === userId);

    if (!user) {
      throw new Error("User not found.");
    }

    user.status = "inactive";
    return cloneRecord(user);
  });
}

export async function resetUserPassword(userId: string): Promise<{ temporaryPassword: string }> {
  return mockRequest(() => {
    const user = mockDatabase.users.find((item) => item.id === userId);

    if (!user) {
      throw new Error("User not found.");
    }

    return { temporaryPassword: `Tmp-${user.id.toUpperCase()}-2026` };
  });
}

export async function getPermissionsMatrix(): Promise<PermissionMatrixRow[]> {
  return mockRequest(() => [
    { module: "Students", create: true, read: true, update: true, delete: true, export: true },
    { module: "Attendance", create: true, read: true, update: true, delete: false, export: true },
    { module: "Devices", create: true, read: true, update: true, delete: true, export: false },
    { module: "Reports", create: false, read: true, update: false, delete: false, export: true },
    { module: "Settings", create: false, read: true, update: true, delete: false, export: false },
  ]);
}
