export type UserRole = "administrator" | "student";

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
}

export interface RefreshSessionPayload {
  refreshToken: string;
}