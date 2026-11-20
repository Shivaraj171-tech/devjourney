// Small, dependency-free helpers for the copy-paste codes (progress backups and
// class reports): UTF-8 <-> base64url, a CRC-32 checksum, and optional
// deflate compression with the browser's built-in CompressionStream.
// Pure functions only, so node can unit-test them.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 of a string's UTF-8 bytes, as 8 lowercase hex digits. */
export function crc32(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export function bytesToBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** null if `text` isn't valid base64url. */
export function base64urlToBytes(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function textToBase64url(text: string): string {
  return bytesToBase64url(new TextEncoder().encode(text));
}

/** null if it isn't base64url or not valid UTF-8. */
export function base64urlToText(text: string): string | null {
  const bytes = base64urlToBytes(text);
  if (!bytes) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function canCompress(): boolean {
  return typeof CompressionStream !== "undefined";
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(stream as unknown as TransformStream<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** deflate-raw; null where the browser has no CompressionStream (older Safari). */
export async function deflate(text: string): Promise<Uint8Array | null> {
  if (!canCompress()) return null;
  try {
    return await pipe(new TextEncoder().encode(text), new CompressionStream("deflate-raw"));
  } catch {
    return null;
  }
}

/** Inflate deflate-raw bytes to text; null if unsupported or corrupt. */
export async function inflate(bytes: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const out = await pipe(bytes, new DecompressionStream("deflate-raw"));
    return new TextDecoder("utf-8", { fatal: true }).decode(out);
  } catch {
    return null;
  }
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
