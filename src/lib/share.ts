/**
 * Share-link encoding/decoding and hash routing helpers.
 *
 * The worksheet content is encoded into the URL hash as `#preview=<payload>`.
 * The payload is `<scheme><base64url-bytes>` where scheme `1` = gzip-compressed
 * (via `CompressionStream`) and `0` = uncompressed. All text is processed as
 * UTF-8 bytes (TextEncoder/TextDecoder) so Unicode is preserved.
 */

export type AppMode = "default" | "demo" | "preview";

export const PREVIEW_HASH_PREFIX = "#preview=";
export const DEMO_HASH = "#demo";

const SCHEME_GZIP = "1";
const SCHEME_PLAIN = "0";

export function parseHash(hash: string): { mode: AppMode; payload?: string } {
  if (hash === DEMO_HASH) return { mode: "demo" };
  if (hash.startsWith(PREVIEW_HASH_PREFIX)) {
    return { mode: "preview", payload: hash.slice(PREVIEW_HASH_PREFIX.length) };
  }
  return { mode: "default" };
}

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize),
    );
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function gzipCompress(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

async function gzipDecompress(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

export async function encodeSharePayload(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>;
  if (typeof CompressionStream !== "undefined") {
    try {
      const compressed = await gzipCompress(bytes);
      return SCHEME_GZIP + bytesToBase64url(compressed);
    } catch {
      /* fall back to plain encoding */
    }
  }
  return SCHEME_PLAIN + bytesToBase64url(bytes);
}

export async function decodeSharePayload(payload: string): Promise<string> {
  if (!payload) return "";
  const scheme = payload[0];
  const bytes = base64urlToBytes(payload.slice(1));
  if (scheme === SCHEME_GZIP) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Compressed share link is not supported in this browser");
    }
    const decompressed = await gzipDecompress(bytes);
    return new TextDecoder().decode(decompressed);
  }
  if (scheme === SCHEME_PLAIN) {
    return new TextDecoder().decode(bytes);
  }
  throw new Error("Unknown share payload scheme");
}

export async function buildPreviewHash(text: string): Promise<string> {
  return PREVIEW_HASH_PREFIX + (await encodeSharePayload(text));
}

export async function buildShareUrl(text: string): Promise<string> {
  const hash = await buildPreviewHash(text);
  return `${location.origin}${location.pathname}${location.search}${hash}`;
}
