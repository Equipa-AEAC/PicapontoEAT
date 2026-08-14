import type { AuthSession, LoginPayload, RefreshSessionPayload, UserRole } from "../types/auth";

import { mockRequest } from "../../../services/mockTransport";

interface MockAccount {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

type MockTokenType = "access" | "refresh";

interface MockTokenPayload {
  type: MockTokenType;
  role: UserRole;
  accountId: string;
  issuedAt: number;
}

const TOKEN_PREFIX = "mock";
const TOKEN_SEPARATOR = ".";

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

function encodePayload(payload: MockTokenPayload) {
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

function decodePayload(encoded: string): MockTokenPayload | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as MockTokenPayload;
  } catch {
    return null;
  }
}

function buildToken(type: MockTokenType, account: MockAccount) {
  const payload: MockTokenPayload = {
    type,
    role: account.role,
    accountId: account.id,
    issuedAt: Date.now(),
  };

  return [TOKEN_PREFIX, encodePayload(payload)].join(TOKEN_SEPARATOR);
}

function parseToken(token: string, expectedType: MockTokenType): MockTokenPayload | null {
  const [prefix, encoded, ...rest] = token.split(TOKEN_SEPARATOR);

  if (prefix !== TOKEN_PREFIX || !encoded || rest.length > 0) {
    return null;
  }

  const payload = decodePayload(encoded);

  if (!payload || payload.type !== expectedType || !payload.accountId || !payload.role) {
    return null;
  }

  return payload;
}

function buildSession(account: MockAccount): AuthSession {
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
}

export async function loginWithPassword(payload: LoginPayload): Promise<AuthSession> {
  return mockRequest(() => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const account = mockAccounts.find((item) => item.email === normalizedEmail);

    if (!account || account.password !== payload.password) {
      throw new Error("Invalid email or password.");
    }

    return buildSession(account);
  });
}

export async function refreshAuthSession(payload: RefreshSessionPayload): Promise<AuthSession> {
  return mockRequest(() => {
    const token = parseToken(payload.refreshToken, "refresh");
    const account = token
      ? mockAccounts.find((item) => item.id === token.accountId && item.role === token.role)
      : undefined;

    if (!account) {
      throw new Error("Invalid refresh token.");
    }

    return buildSession(account);
  });
}