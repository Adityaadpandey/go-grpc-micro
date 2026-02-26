export type Role = "admin" | "user";

export interface SessionPayload {
  sub: string; // accountId
  name: string;
  role: Role;
  jti: string; // unique token ID
  csrf: string; // CSRF token (mirrors csrf-token cookie)
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
}

export interface AuthStoreEntry {
  accountId: string;
  name: string;
  hashedPassword: string; // PBKDF2 hex
  salt: string; // hex
  iterations: number;
  role: Role;
  createdAt: string; // ISO timestamp
}

export interface AuthStore {
  [name: string]: AuthStoreEntry;
}

export interface RegisterInput {
  name: string;
  password: string;
  role?: Role;
}

export interface LoginInput {
  name: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface ApiError {
  error: string;
  code?: string;
}
