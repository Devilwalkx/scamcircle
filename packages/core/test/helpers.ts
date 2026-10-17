import type { KeyValueStore, SecureKeyStore } from "../src/index.js";

export class MemKeys implements SecureKeyStore {
  m = new Map<string, Uint8Array>();
  async get(n: string) { return this.m.get(n) ?? null; }
  async set(n: string, k: Uint8Array) { this.m.set(n, k); }
  async delete(n: string) { this.m.delete(n); }
}
export class MemKV implements KeyValueStore {
  m = new Map<string, string>();
  async get(n: string) { return this.m.get(n) ?? null; }
  async set(n: string, v: string) { this.m.set(n, v); }
  async delete(n: string) { this.m.delete(n); }
}
export const NOW = Date.UTC(2026, 9, 17, 9, 0, 0);
export const H = 3600_000;
/** A long, unmistakable marker that cannot occur by chance in random hex/base64 output. */
export const MARK = "ZEBRA-QUOKKA-MARKER-8f3a2c91-do-not-leak";
