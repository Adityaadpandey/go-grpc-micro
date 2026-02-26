/**
 * CSRF protection via the double-submit cookie pattern.
 *
 * Flow:
 *  1. On login/register → generate a random CSRF token.
 *  2. Store it in BOTH the JWT payload AND a readable cookie (csrf-token).
 *  3. Client reads csrf-token cookie, sends it in X-CSRF-Token header.
 *  4. API routes validate: X-CSRF-Token header == JWT payload.csrf.
 */

/** Generate a cryptographically random CSRF token (hex string). */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate the CSRF token on mutating requests.
 * Call this in every POST/PUT/DELETE API route.
 */
export function validateCsrf(
  headerToken: string | null,
  jwtCsrf: string | null
): boolean {
  if (!headerToken || !jwtCsrf) return false;

  // Constant-time comparison
  const a = Buffer.from(headerToken, "utf-8");
  const b = Buffer.from(jwtCsrf, "utf-8");
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}
