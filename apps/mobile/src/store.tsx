import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { VaultKeyMissing, VaultService, type DeviceState, type Root } from "@scamcircle/core";
import { expoKeyStore } from "./keystore";
import { storage } from "./storage";

export type Viewer = "me" | "demo";

interface Ctx {
  root: Root;
  svc: VaultService;
  /** The phone the person is looking at: theirs, or the built-in demo helper. */
  viewer: Viewer;
  setViewer: (v: Viewer) => void;
  dev: DeviceState;
  now: () => number;
  /** Demo only: pretend this many ms have passed (to see expiry and 'no reply'). */
  clockOffset: number;
  setClockOffset: (n: number) => void;
  updateRoot: (fn: (r: Root) => Root) => Promise<void>;
  updateDev: (fn: (d: DeviceState) => DeviceState) => Promise<void>;
  replaceRoot: (r: Root | null) => void;
}
const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("store missing");
  return c;
};

export const service = new VaultService(expoKeyStore, storage);

export type LoadState = { kind: "loading" } | { kind: "error"; message: string; keyMissing: boolean } | { kind: "ready"; root: Root };

export function useLoadVault(): { state: LoadState; gen: number; reload: () => void; set: (r: Root) => void } {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = (await service.load()) ?? (await service.create("Me", Date.now()));
        if (live) setState({ kind: "ready", root: r });
      } catch (e) {
        if (live) setState({ kind: "error", message: e instanceof Error ? e.message : "Could not open your saved data.", keyMissing: e instanceof VaultKeyMissing });
      }
    })();
    return () => { live = false; };
  }, [n]);
  return { state, gen: n, reload: () => { setState({ kind: "loading" }); setN((x) => x + 1); }, set: (r) => setState({ kind: "ready", root: r }) };
}

export function StoreProvider({ initial, children, onReplace }: { initial: Root; children: React.ReactNode; onReplace: (r: Root | null) => void }) {
  const [root, setRoot] = useState<Root>(initial);
  const [viewer, setViewer] = useState<Viewer>("me");
  const [clockOffset, setClockOffset] = useState(0);
  const ref = useRef(root);
  ref.current = root;
  const offsetRef = useRef(0);
  offsetRef.current = clockOffset;

  const updateRoot = useCallback(async (fn: (r: Root) => Root) => {
    const next = fn(ref.current);
    ref.current = next;
    setRoot(next);
    await service.save(next);
  }, []);
  const v = viewer === "demo" && root.demo ? "demo" : "me";
  const updateDev = useCallback((fn: (d: DeviceState) => DeviceState) => updateRoot((r) => (v === "demo" && r.demo ? { ...r, demo: fn(r.demo) } : { ...r, me: fn(r.me) })), [updateRoot, v]);
  const value = useMemo<Ctx>(() => ({
    root, svc: service, viewer: v, setViewer, dev: v === "demo" && root.demo ? root.demo : root.me,
    now: () => Date.now() + offsetRef.current, clockOffset, setClockOffset, updateRoot, updateDev, replaceRoot: (r) => { if (r) { ref.current = r; setRoot(r); } onReplace(r); }
  }), [root, v, clockOffset, updateRoot, updateDev, onReplace]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
