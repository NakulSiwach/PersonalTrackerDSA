import { randomBytes } from "node:crypto";

// The spec allows 5 MB, but Vercel rejects request bodies over 4.5 MB before they reach the
// app, so the limit is 4 MB (leaving room for the multipart wrapper).
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** Only names we generated ourselves: `<cuid>.<ext>`. Blocks path traversal outright. */
export const SAFE_FILENAME = /^[a-z0-9]{20,32}\.(png|jpg|gif|webp)$/;

/** cuid-style id: "c" + timestamp + random, lowercase alphanumeric (no extra dependency). */
export function createCuid(): string {
  return ("c" + Date.now().toString(36) + randomBytes(10).toString("hex")).slice(0, 25);
}

/** Checks the file's real type from its first bytes, so a renamed .txt is rejected. */
export function sniffImageType(b: Uint8Array): string | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (
    String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" &&
    String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
