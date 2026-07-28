import type { AuthSession, LoginPayload, RefreshSessionPayload, UserRole } from "../types/auth";

import { mockRequest } from "../../../services/mockTransport";

interface MockAccount {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

const mockAccounts: MockAccount[] = [
  {
    id: "adm-1",
    fullName: "System Administrator",
    email: "admin@school.local",
    password: "password",
    role: "administrator",
  },
  {
    id: "stu-1",
    fullName: "Ana Beatriz Souza",
    email: "student@school.local",
    password: "password",
    role: "student",
  },
];

function buildToken(prefix: string, account: MockAccount) {
  return `${prefix}-${account.role}-${account.id}-${Date.now()}`;
}

export async function loginWithPassword(payload: LoginPayload): Promise<AuthSession> {
  return mockRequest(() => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const account = mockAccounts.find((item) => item.email === normalizedEmail);

    if (!account || account.password !== payload.password) {
      throw new Error("Invalid email or password.");
    }

    return {
      accessToken: buildToken("access", account),
      refreshToken: buildToken("refresh", account),
      user: {
        id: account.id,
        fullName: account.fullName,
        email: account.email,
      },
      role: account.role,
    };
  });
}

export async function refreshAuthSession(payload: RefreshSessionPayload): Promise<AuthSession> {
  return mockRequest(() => {
    const [, , role, id] = payload.refreshToken.split("-");
    const account = mockAccounts.find((item) => item.id === id && item.role === role);

    if (!account) {
      throw new Error("Invalid refresh token.");
    }

    return {
      accessToken: buildToken("access", account),
      refreshToken: buildToken("refresh", account),
      user: {
        id: account.id,
        fullName: account.fullName,
        email: account.email,
      },
      role: account.role,
    };
  });
}