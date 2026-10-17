import { x25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { z } from "zod";
import { b64urlDecode, b64urlEncode, bytesToHex, cleanDisplayText, hexToBytes, utf8Decode, utf8Encode } from "./util.js";

/**
 * Device identity and contact codes.
 * Each phone generates an X25519 key pair. The "contact code" is the public key plus a display name.
 * A code is NOT proof of who someone is: contacts stay "not verified" until the two people compare
 * the short word fingerprint out loud (or in person). Nothing here talks to a server or key directory.
 */

export interface Identity { name: string; pk: string; sk: string }

export function newIdentity(name: string): Identity {
  const sk = x25519.utils.randomSecretKey();
  return { name: cleanDisplayText(name, 40) || "Me", pk: bytesToHex(x25519.getPublicKey(sk)), sk: bytesToHex(sk) };
}

/** Rejects malformed and low-order public keys (a DH with those gives an all-zero secret, which noble refuses). */
export function isUsablePublicKey(pkHex: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(pkHex)) return false;
  try {
    x25519.getSharedSecret(x25519.utils.randomSecretKey(), hexToBytes(pkHex));
    return true;
  } catch {
    return false;
  }
}

// 4 pronounceable words (consonant-vowel-consonant-vowel-consonant): 102,400 per word, about 66 bits in total.
const C = "bdfghjklmnprstvz";
const V = "aeiou";
function wordFor(n: number): string {
  const c1 = n % 16; n = (n - c1) / 16;
  const v1 = n % 5; n = (n - v1) / 5;
  const c2 = n % 16; n = (n - c2) / 16;
  const v2 = n % 5; n = (n - v2) / 5;
  const c3 = n % 16;
  return C[c1]! + V[v1]! + C[c2]! + V[v2]! + C[c3]!;
}

/** Four short made-up words derived from the public key. Both people compare them out of band. */
export function fingerprintWords(pkHex: string): string[] {
  const h = sha256(utf8Encode("scamcircle/v1/fingerprint|" + pkHex));
  const out: string[] = [];
  for (let i = 0; i < 4; i++) {
    const n = ((h[i * 3]! << 16) | (h[i * 3 + 1]! << 8) | h[i * 3 + 2]!) % 102400;
    out.push(wordFor(n));
  }
  return out;
}
export const fingerprintText = (pkHex: string) => fingerprintWords(pkHex).join(" ");

const ContactCodeSchema = z.object({ v: z.literal(1), n: z.string().max(80), k: z.string().length(64) }).strict();
export const CONTACT_PREFIX = "SCC1.";

export function makeContactCode(id: Identity): string {
  return CONTACT_PREFIX + b64urlEncode(utf8Encode(JSON.stringify({ v: 1, n: id.name, k: id.pk })));
}

export type ParsedContact = { ok: true; name: string; pk: string } | { ok: false; message: string };

export function parseContactCode(raw: string): ParsedContact {
  const s = raw.trim().replace(/\s+/g, "");
  if (s.length > 400 || !s.startsWith(CONTACT_PREFIX)) return { ok: false, message: "That is not a ScamCircle contact code." };
  try {
    const obj = ContactCodeSchema.parse(JSON.parse(utf8Decode(b64urlDecode(s.slice(CONTACT_PREFIX.length)))));
    const name = cleanDisplayText(obj.n, 40);
    if (!name) return { ok: false, message: "The contact code has no usable name." };
    if (!isUsablePublicKey(obj.k)) return { ok: false, message: "The contact code contains an invalid key." };
    return { ok: true, name, pk: obj.k };
  } catch {
    return { ok: false, message: "That contact code is damaged or not valid." };
  }
}
