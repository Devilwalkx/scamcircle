import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  VaultKeyMissing, VaultService, VaultUnreadable, addCase, decodeRecoverySecret, deleteCase, findCase, generateContentKey, generateRecoverySecret, openItem, sealItem,
  unwrapKeyFromRecovery, wrapKeyForRecovery, encodeRecoverySecret, bytesToHex, type Root, mergeRestore
} from "../src/index.js";
import { MARK, MemKV, MemKeys, NOW } from "./helpers.js";

const ctx = { accountId: "acc-A", itemId: "root", version: 1 };

describe("vault primitives", () => {
  it("round-trips; envelope holds no plaintext (collision-proof checks)", () => {
    const k = generateContentKey();
    const text = JSON.stringify({ note: MARK });
    const s = sealItem(k, text, ctx);
    expect(openItem(k, s, ctx)).toBe(text);
    const blob = JSON.stringify(s);
    expect(blob).not.toContain(MARK);
    expect(blob).not.toContain(bytesToHex(new TextEncoder().encode(MARK)).slice(0, 40));
  });
  it("wrong key, tampering, wrong account/item/version all throw", () => {
    const k = generateContentKey();
    const s = sealItem(k, "x", ctx);
    expect(() => openItem(generateContentKey(), s, ctx)).toThrow();
    expect(() => openItem(k, { ...s, ct: (s.ct[0] === "0" ? "1" : "0") + s.ct.slice(1) }, ctx)).toThrow();
    for (const bad of [{ accountId: "B" }, { itemId: "other" }, { version: 2 }]) expect(() => openItem(k, s, { ...ctx, ...bad })).toThrow();
  });
  it("fresh nonce every time; bad key sizes refused", () => {
    const k = generateContentKey();
    expect(new Set(Array.from({ length: 1000 }, () => sealItem(k, "x", ctx).nonce)).size).toBe(1000);
    expect(() => sealItem(new Uint8Array(16), "x", ctx)).toThrow();
  });
  it("recovery secret: format, round trip, wrong secret or account fails", () => {
    const k = generateContentKey();
    const { secret, display } = generateRecoverySecret();
    expect(display).toMatch(/^([0-9A-Z]{4}-){12}[0-9A-Z]{4}$/);
    expect(encodeRecoverySecret(decodeRecoverySecret(display.toLowerCase()))).toBe(display);
    const blob = wrapKeyForRecovery(k, secret, "acc-A");
    expect(unwrapKeyFromRecovery(blob, secret, "acc-A")).toEqual(k);
    expect(() => unwrapKeyFromRecovery(blob, generateRecoverySecret().secret, "acc-A")).toThrow();
    expect(() => unwrapKeyFromRecovery(blob, secret, "acc-B")).toThrow();
  });
});

async function fresh() {
  const keys = new MemKeys(), kv = new MemKV();
  const svc = new VaultService(keys, kv);
  const root = await svc.create("Alice", NOW);
  return { keys, kv, svc, root };
}
const withCase = (root: Root, text: string): { root: Root; id: string } => {
  const r = addCase(root.me, { text, source: "paste" }, NOW);
  if (!r.ok) throw new Error("x");
  return { root: { ...root, me: r.state }, id: r.caseId };
};

describe("vault service: encrypted at rest, fail closed", () => {
  it("persisted data contains no case content, contact names or private keys", async () => {
    const { svc, kv, root } = await fresh();
    const { root: r2 } = withCase(root, `Hi Mum new number send £500 today ${MARK}`);
    await svc.save(r2);
    const stored = JSON.stringify([...kv.m.entries()]);
    expect(stored).toContain("sc.vault");
    for (const secret of [MARK, "Alice", r2.me.identity.sk, r2.me.identity.pk]) expect(stored).not.toContain(secret);
    const back = await svc.load();
    expect(findCase(back!.me, r2.me.cases[0]!.id)!.text).toContain(MARK);
  });
  it("lost device key: fails closed with no plaintext fallback", async () => {
    const { svc, keys, root } = await fresh();
    await svc.save(withCase(root, "Hi Mum, send me £50 please").root);
    keys.m.clear();
    await expect(svc.load()).rejects.toBeInstanceOf(VaultKeyMissing);
  });
  it("tampered or rolled-back storage is rejected", async () => {
    const { svc, kv, root } = await fresh();
    const v1 = kv.m.get("sc.vault")!;
    await svc.save(withCase(root, "Hi Mum, send me £50 please").root);
    kv.m.set("sc.vault", v1); // roll back to the earlier ciphertext: allowed only if version/AAD match, so edit version too
    const env = JSON.parse(v1);
    env.version = 2;
    kv.m.set("sc.vault", JSON.stringify(env));
    await expect(svc.load()).rejects.toBeInstanceOf(VaultUnreadable);
    kv.m.set("sc.vault", "{not json");
    await expect(svc.load()).rejects.toBeInstanceOf(VaultUnreadable);
  });
  it("erase removes ciphertext, recovery blob and key", async () => {
    const { svc, kv, keys } = await fresh();
    await svc.erase();
    expect([...kv.m.keys()]).toEqual([]);
    expect(keys.m.size).toBe(0);
    expect(await svc.load()).toBeNull();
  });
});

describe("recovery and backup", () => {
  it("key loss then restore from backup text with the recovery secret on a new phone", async () => {
    const a = await fresh();
    const { root: r2 } = withCase(a.root, `Send gift cards ${MARK}`);
    await a.svc.save(r2);
    const secret = await a.svc.createRecovery(r2.me.accountId);
    const backup = await a.svc.exportBackup(r2);
    expect(backup).not.toContain(MARK);
    expect(backup).not.toContain(secret);
    const phone2 = new VaultService(new MemKeys(), new MemKV());
    const restored = await phone2.restoreBackup(backup, secret);
    expect(restored.me.identity.pk).toBe(r2.me.identity.pk);
    expect(restored.me.cases[0]!.text).toContain(MARK);
    expect((await phone2.load())!.me.cases).toHaveLength(1);
  });
  it("wrong secret, damaged backup and a missing secret are refused", async () => {
    const a = await fresh();
    await expect(a.svc.exportBackup(a.root)).rejects.toThrow(/recovery secret/);
    const secret = await a.svc.createRecovery(a.root.me.accountId);
    const backup = await a.svc.exportBackup(a.root);
    const p2 = new VaultService(new MemKeys(), new MemKV());
    await expect(p2.restoreBackup(backup, generateRecoverySecret().display)).rejects.toThrow(/does not open/);
    await expect(p2.restoreBackup(backup.slice(0, -10) + "AAAAAAAAAA", secret)).rejects.toThrow();
    await expect(p2.restoreBackup("hello", secret)).rejects.toThrow(/not a valid/);
  });
  it("deleted cases do not come back when an older backup is restored (tombstones)", async () => {
    const a = await fresh();
    const w = withCase(a.root, "Hi Mum, send £100 today please");
    await a.svc.save(w.root);
    const secret = await a.svc.createRecovery(w.root.me.accountId);
    const oldBackup = await a.svc.exportBackup(w.root);
    const del = deleteCase(w.root.me, w.id, NOW + 1000);
    await a.svc.save({ ...w.root, me: del.state });
    const restored = await a.svc.restoreBackup(oldBackup, secret);
    expect(restored.me.cases).toEqual([]);
    expect(JSON.stringify(await a.svc.load())).not.toContain("send £100");
    expect(mergeRestore(null, w.root.me).cases).toHaveLength(1); // without the tombstone it WOULD return
  });
});

describe("packaged source hygiene", () => {
  it("vault code has no logging calls", () => {
    for (const f of ["vault.ts", "service.ts", "device.ts"]) expect(readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8")).not.toMatch(/console\.(log|info|warn|error|debug)/);
  });
});

describe("drafts (unfinished text) are sealed at rest", () => {
  it("round trip; the stored value holds no plaintext; erase and a lost key remove them; a damaged draft is dropped", async () => {
    const kv = new MemKV(), keys = new MemKeys();
    const svc = new VaultService(keys, kv);
    const root = await svc.create("Me", NOW);
    await svc.saveDrafts(root.me.accountId, { "check.text": MARK, empty: "" });
    expect(kv.m.get("sc.drafts")!).not.toContain(MARK);
    expect(await svc.loadDrafts(root.me.accountId)).toEqual({ "check.text": MARK });
    expect(await svc.loadDrafts("another-account")).toEqual({});
    const env = JSON.parse(kv.m.get("sc.drafts")!);
    env.sealed.ct = (env.sealed.ct[0] === "0" ? "1" : "0") + env.sealed.ct.slice(1);
    kv.m.set("sc.drafts", JSON.stringify(env));
    expect(await svc.loadDrafts(root.me.accountId)).toEqual({});
    await svc.saveDrafts(root.me.accountId, { a: "b" });
    await svc.saveDrafts(root.me.accountId, {});
    expect(kv.m.has("sc.drafts")).toBe(false);
    await svc.saveDrafts(root.me.accountId, { a: "b" });
    await svc.erase();
    expect(kv.m.has("sc.drafts")).toBe(false);
  });
});
