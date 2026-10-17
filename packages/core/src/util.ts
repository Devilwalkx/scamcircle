import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";

export { bytesToHex, hexToBytes };

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** base64url without padding. Written out so it does not depend on atob/btoa being present on every JS engine. */
export function b64urlEncode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2]!;
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)]!;
    if (b !== undefined) out += B64[((b & 15) << 2) | ((c ?? 0) >> 6)]!;
    if (c !== undefined) out += B64[c & 63]!;
  }
  return out;
}

export function b64urlDecode(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) throw new Error("Invalid base64url");
  const out: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of s) {
    acc = (acc << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      out.push((acc >>> (bits - 8)) & 255);
      bits -= 8;
      acc &= (1 << bits) - 1;
    }
  }
  return Uint8Array.from(out);
}

export function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
export function utf8Decode(b: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(b);
}

/** Remove control characters, bidirectional overrides and zero-width characters from a display string. */
export function cleanDisplayText(s: string, max: number): string {
  return s
    .normalize("NFC")
    .replace(/[\p{C}​-‏‪-‮⁦-⁩﻿]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function randomHex(bytes: number): string {
  const b = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(b);
  return bytesToHex(b);
}
