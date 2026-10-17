import { z } from "zod";
import {
  decodeRecoverySecret, generateContentKey, generateRecoverySecret, openItem, sealItem, unwrapKeyFromRecovery, wrapKeyForRecovery,
  type RecoveryBlob, type SealedItem, type SecureKeyStore
} from "./vault.js";
import { applyTombstones, createDevice, mergeRestore, type DeviceState } from "./device.js";
import { b64urlDecode, b64urlEncode, utf8Decode, utf8Encode } from "./util.js";

/** Small key-value store for ciphertext and non-secret settings. Never keys, never plaintext. */
export interface KeyValueStore {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  delete(name: string): Promise<void>;
}

/** What one phone holds. `demo` is the built-in second person for trying the flow on a single phone. */
export interface Root { me: DeviceState; demo: DeviceState | null }

export class VaultKeyMissing extends Error {
  constructor() { super("The key for this vault is missing on this device. Recovery is needed."); }
}
export class VaultUnreadable extends Error {
  constructor() { super("The saved data could not be opened (damaged or changed)."); }
}

const KEY_NAME = "content";
const VAULT = "sc.vault";
const RECOVERY = "sc.recovery";
export const BACKUP_PREFIX = "SCB1.";

interface Envelope { v: 1; accountId: string; version: number; sealed: SealedItem }
const BackupSchema = z.object({
  v: z.literal(1), accountId: z.string().min(8).max(64), version: z.number().int().min(1),
  sealed: z.object({ v: z.literal(1), alg: z.literal("xchacha20poly1305"), nonce: z.string(), ct: z.string() }),
  recovery: z.object({ v: z.literal(1), nonce: z.string(), ct: z.string() })
}).strict();

/**
 * Persistence with fail-closed behaviour: all case content, contacts and private keys live in ONE
 * XChaCha20-Poly1305 blob under a device key that sits in the platform secure store.
 * There is no plaintext fallback anywhere.
 */
export class VaultService {
  constructor(private readonly keys: SecureKeyStore, private readonly kv: KeyValueStore) {}

  async load(): Promise<Root | null> {
    const raw = await this.kv.get(VAULT);
    if (!raw) return null;
    let env: Envelope;
    try { env = JSON.parse(raw) as Envelope; } catch { throw new VaultUnreadable(); }
    const key = await this.keys.get(KEY_NAME);
    if (!key) throw new VaultKeyMissing();
    try {
      return JSON.parse(openItem(key, env.sealed, { accountId: env.accountId, itemId: "root", version: env.version })) as Root;
    } catch { throw new VaultUnreadable(); }
  }

  async create(name: string, now: number): Promise<Root> {
    const root: Root = { me: createDevice(name, now), demo: null };
    await this.keys.set(KEY_NAME, generateContentKey());
    await this.kv.delete(RECOVERY);
    await this.write(root, 0);
    return root;
  }

  async save(root: Root): Promise<void> {
    const raw = await this.kv.get(VAULT);
    const version = raw ? (JSON.parse(raw) as Envelope).version : 0;
    await this.write(root, version);
  }

  private async write(root: Root, prevVersion: number): Promise<void> {
    const key = await this.keys.get(KEY_NAME);
    if (!key) throw new VaultKeyMissing();
    const version = prevVersion + 1;
    const accountId = root.me.accountId;
    const sealed = sealItem(key, JSON.stringify(root), { accountId, itemId: "root", version });
    await this.kv.set(VAULT, JSON.stringify({ v: 1, accountId, version, sealed } satisfies Envelope));
  }

  async hasRecovery(): Promise<boolean> { return (await this.kv.get(RECOVERY)) !== null; }

  /** Returns the secret to show ONCE. Only a wrapped copy of the device key is stored; the secret is not. */
  async createRecovery(accountId: string): Promise<string> {
    const key = await this.keys.get(KEY_NAME);
    if (!key) throw new VaultKeyMissing();
    const { secret, display } = generateRecoverySecret();
    await this.kv.set(RECOVERY, JSON.stringify(wrapKeyForRecovery(key, secret, accountId)));
    return display;
  }

  /** Encrypted backup text. Needs a recovery secret to have been created first. Anyone holding backup AND secret can read it. */
  async exportBackup(root: Root): Promise<string> {
    const key = await this.keys.get(KEY_NAME);
    const rec = await this.kv.get(RECOVERY);
    if (!key) throw new VaultKeyMissing();
    if (!rec) throw new Error("Create a recovery secret first.");
    const accountId = root.me.accountId;
    const version = Date.now();
    const sealed = sealItem(key, JSON.stringify(root), { accountId, itemId: "backup", version });
    return BACKUP_PREFIX + b64urlEncode(utf8Encode(JSON.stringify({ v: 1, accountId, version, sealed, recovery: JSON.parse(rec) as RecoveryBlob })));
  }

  /** Restore from backup text plus the recovery secret. Deletions made on this phone since are re-applied (tombstones). */
  async restoreBackup(text: string, recoverySecretDisplay: string): Promise<Root> {
    let b: z.infer<typeof BackupSchema>;
    try {
      const t = text.trim().replace(/\s+/g, "");
      if (!t.startsWith(BACKUP_PREFIX)) throw new Error();
      b = BackupSchema.parse(JSON.parse(utf8Decode(b64urlDecode(t.slice(BACKUP_PREFIX.length)))));
    } catch { throw new Error("That is not a valid ScamCircle backup."); }
    let root: Root;
    let key: Uint8Array;
    try {
      key = unwrapKeyFromRecovery(b.recovery, decodeRecoverySecret(recoverySecretDisplay), b.accountId);
      root = JSON.parse(openItem(key, b.sealed, { accountId: b.accountId, itemId: "backup", version: b.version })) as Root;
    } catch { throw new Error("The recovery secret does not open this backup."); }
    let current: Root | null = null;
    try { current = await this.load(); } catch { current = null; }
    const merged: Root = {
      me: mergeRestore(current && current.me.accountId === root.me.accountId ? current.me : null, root.me),
      demo: root.demo ? mergeRestore(current?.demo ?? null, root.demo) : null
    };
    await this.keys.set(KEY_NAME, key);
    await this.kv.set(RECOVERY, JSON.stringify(b.recovery));
    await this.write(merged, 0);
    return merged;
  }

  async erase(): Promise<void> {
    await this.kv.delete(VAULT);
    await this.kv.delete(RECOVERY);
    await this.keys.delete(KEY_NAME);
  }
}

export { applyTombstones };
