/**
 * File-based auth store.
 * Stores credential records as JSON (server-side only, never sent to browser).
 * In production, replace with a proper database.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { AuthStore, AuthStoreEntry, Role } from "@/types/auth";

const STORE_PATH =
  process.env.AUTH_STORE_PATH ??
  join(process.cwd(), "data", "auth.json");

function ensureStoreDir(): void {
  const dir = STORE_PATH.split("/").slice(0, -1).join("/");
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readStore(): AuthStore {
  try {
    if (!existsSync(STORE_PATH)) return {};
    const raw = readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw) as AuthStore;
  } catch {
    return {};
  }
}

function writeStore(store: AuthStore): void {
  ensureStoreDir();
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), {
    mode: 0o600, // owner read/write only
  });
}

/** PBKDF2 with 310,000 iterations – OWASP recommended minimum */
const PBKDF2_ITERATIONS = 310_000;

async function deriveKey(
  password: string,
  salt: string
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: Buffer.from(salt, "hex"),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return Buffer.from(bits).toString("hex");
}

function randomHex(bytes = 32): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString(
    "hex"
  );
}

export async function createCredential(
  name: string,
  password: string,
  accountId: string,
  role: Role = "user"
): Promise<void> {
  const store = readStore();
  if (store[name]) {
    throw new Error("An account with that name already exists");
  }
  const salt = randomHex(32);
  const hashedPassword = await deriveKey(password, salt);
  const entry: AuthStoreEntry = {
    accountId,
    name,
    hashedPassword,
    salt,
    iterations: PBKDF2_ITERATIONS,
    role,
    createdAt: new Date().toISOString(),
  };
  store[name] = entry;
  writeStore(store);
}

export async function verifyCredential(
  name: string,
  password: string
): Promise<AuthStoreEntry | null> {
  const store = readStore();
  const entry = store[name];
  if (!entry) return null;

  const hash = await deriveKey(password, entry.salt);
  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(entry.hashedPassword, "hex");
  if (a.length !== b.length) return null;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0 ? entry : null;
}

export function credentialExists(name: string): boolean {
  const store = readStore();
  return Boolean(store[name]);
}
