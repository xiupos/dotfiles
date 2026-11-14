import * as crypto from "crypto";

export function sha256(...parts: string[]): string {
  const h = crypto.createHash("sha256");
  for (const p of parts) {
    h.update(String(p.length));
    h.update(":");
    h.update(p);
  }
  return h.digest("hex");
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
