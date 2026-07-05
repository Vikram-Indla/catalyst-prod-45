/**
 * ydocBytea — Uint8Array <-> Postgres bytea hex-escape string conversion
 * (CAT-DOCEX-DB-COEDIT-20260705-001 C3). PostgREST serializes `bytea`
 * columns as `"\\x<hex>"` (Postgres's hex output format), not base64 — this
 * is the ONE encoding kb_documents.ydoc_state round-trips over REST.
 */

export function u8ToPgHex(bytes: Uint8Array): string {
  let hex = '\\x';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function pgHexToU8(hex: string | null | undefined): Uint8Array | null {
  if (!hex) return null;
  const body = hex.startsWith('\\x') ? hex.slice(2) : hex;
  if (body.length % 2 !== 0) return null;
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(body.substr(i * 2, 2), 16);
  }
  return out;
}
