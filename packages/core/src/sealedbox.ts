import { x25519 } from "@noble/curves/ed25519.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { z } from "zod";
import { b64urlDecode, b64urlEncode, bytesToHex, hexToBytes, randomHex, utf8Decode, utf8Encode } from "./util.js";

/**
 * Authenticated sealed box for share, reply and revoke messages.
 *
 * AN HPKE-LIKE COMPOSITION OF AUDITED PRIMITIVES. IT IS NOT HPKE (RFC 9180), HAS NOT BEEN REVIEWED BY AN
 * INDEPENDENT CRYPTOGRAPHER AND MUST BE BEFORE ANY REAL USE. No homemade primitives are involved.
 *
 *   eph        = fresh X25519 key pair per message
 *   dh1        = X25519(eph_sk, recipient_pk)       (only the recipient can recompute)
 *   dh2        = X25519(sender_sk, recipient_pk)    (authenticates the sender's static key)
 *   key        = HKDF-SHA256(dh1 || dh2, salt = eph_pk || sender_pk || recipient_pk, info = domain)
 *   ciphertext = XChaCha20-Poly1305(key, random 192-bit nonce, aad = canonical header)
 *
 * Known limits to review: no forward secrecy against later theft of the recipient's static key; sender
 * key compromise impersonation; no sequence numbers beyond message ids kept by the receiving app;
 * "expires" is enforced by the receiving app's clock, so it is a courtesy, not a cryptographic guarantee.
 */

const DOMAIN = "scamcircle/v1/box";
export const MESSAGE_PREFIX = "SCM1.";
export const MAX_MESSAGE_CHARS = 24000;

export const MessageType = z.enum(["share", "reply", "revoke"]);
export type MessageType = z.infer<typeof MessageType>;

const Hex = (n: number) => z.string().regex(new RegExp(`^[0-9a-f]{${n}}$`));
const WireSchema = z.object({
  v: z.literal(1),
  t: MessageType,
  id: Hex(32),
  from: Hex(64),
  to: Hex(64),
  eph: Hex(64),
  grant: Hex(32),
  created: z.number().int().nonnegative(),
  exp: z.number().int().nonnegative().nullable(),
  nonce: Hex(48),
  ct: z.string().regex(/^[0-9a-f]+$/).max(MAX_MESSAGE_CHARS)
}).strict();
export type WireMessage = z.infer<typeof WireSchema>;
type Header = Omit<WireMessage, "nonce" | "ct">;

function aad(h: Header): Uint8Array {
  return utf8Encode(JSON.stringify([DOMAIN, h.v, h.t, h.id, h.from, h.to, h.eph, h.grant, h.created, h.exp]));
}
function deriveKey(dh1: Uint8Array, dh2: Uint8Array, eph: string, from: string, to: string): Uint8Array {
  const ikm = new Uint8Array(64);
  ikm.set(dh1, 0);
  ikm.set(dh2, 32);
  return hkdf(sha256, ikm, utf8Encode(eph + from + to), utf8Encode(DOMAIN), 32);
}

export interface SealParams {
  type: MessageType;
  senderSk: string;
  senderPk: string;
  recipientPk: string;
  grant: string;
  created: number;
  exp: number | null;
  payload: unknown;
}

export function sealMessage(p: SealParams): { text: string; id: string } {
  const eph = x25519.utils.randomSecretKey();
  const ephPk = bytesToHex(x25519.getPublicKey(eph));
  const rpk = hexToBytes(p.recipientPk);
  const dh1 = x25519.getSharedSecret(eph, rpk);
  const dh2 = x25519.getSharedSecret(hexToBytes(p.senderSk), rpk);
  const header: Header = { v: 1, t: p.type, id: randomHex(16), from: p.senderPk, to: p.recipientPk, eph: ephPk, grant: p.grant, created: p.created, exp: p.exp };
  const nonce = randomBytes(24);
  const ct = xchacha20poly1305(deriveKey(dh1, dh2, ephPk, p.senderPk, p.recipientPk), nonce, aad(header)).encrypt(utf8Encode(JSON.stringify(p.payload)));
  const wire: WireMessage = { ...header, nonce: bytesToHex(nonce), ct: bytesToHex(ct) };
  return { text: MESSAGE_PREFIX + b64urlEncode(utf8Encode(JSON.stringify(wire))), id: header.id };
}

export type ParseResult = { ok: true; wire: WireMessage } | { ok: false; message: string };

export function parseWire(raw: string): ParseResult {
  const s = raw.trim().replace(/\s+/g, "");
  if (s.length > MAX_MESSAGE_CHARS * 2 + 2000) return { ok: false, message: "That is too long to be a ScamCircle message." };
  if (!s.startsWith(MESSAGE_PREFIX)) return { ok: false, message: "That is not a ScamCircle message." };
  try {
    return { ok: true, wire: WireSchema.parse(JSON.parse(utf8Decode(b64urlDecode(s.slice(MESSAGE_PREFIX.length))))) };
  } catch {
    return { ok: false, message: "That message is damaged or not valid." };
  }
}

/** Returns the decrypted JSON or null. Wrong key, wrong sender, tampering and header edits all give null. */
export function openMessage(wire: WireMessage, recipientSk: string): unknown | null {
  try {
    const sk = hexToBytes(recipientSk);
    const dh1 = x25519.getSharedSecret(sk, hexToBytes(wire.eph));
    const dh2 = x25519.getSharedSecret(sk, hexToBytes(wire.from));
    const { nonce, ct, ...header } = wire;
    const pt = xchacha20poly1305(deriveKey(dh1, dh2, wire.eph, wire.from, wire.to), hexToBytes(nonce), aad(header)).decrypt(hexToBytes(ct));
    return JSON.parse(utf8Decode(pt));
  } catch {
    return null;
  }
}
