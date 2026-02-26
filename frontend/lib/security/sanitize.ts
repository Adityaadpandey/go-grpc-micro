"use client";

/**
 * XSS sanitisation helpers (client-side only).
 * Uses DOMPurify to strip dangerous HTML.
 *
 * React already escapes interpolated values, so this is only
 * needed when you explicitly set innerHTML or render user HTML.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createDOMPurify = require("isomorphic-dompurify") as {
  sanitize: (dirty: string, config?: Record<string, unknown>) => string;
};

const CONFIG = {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
  ALLOWED_ATTR: [] as string[],
  FORBID_SCRIPTS: true,
  FORBID_ATTR: ["style", "onerror", "onload"],
};

/** Sanitise a string of HTML before rendering with dangerouslySetInnerHTML. */
export function sanitizeHTML(dirty: string): string {
  return createDOMPurify.sanitize(dirty, CONFIG);
}

/** Escape plain text to prevent it being interpreted as HTML. */
export function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
