import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useStore } from "./store";

export type Screen = "home" | "check" | "people" | "waiting" | "settings";

/** Something another app sent to ScamCircle through the Android share sheet (or a test stand-in on the web). */
export interface Incoming { text?: string; imageUri?: string; at: number; simulated?: boolean }

interface Ctx {
  screen: Screen;
  go(s: Screen, param?: string): void;
  /** Changes on every navigation, including tapping the tab you are already on (which returns to that tab's first screen). */
  navNonce: number;
  takeParam(): string | null;
  /** Where Back goes from here. Returns false when the system should handle Back (leave the app). */
  back(): boolean;
  /** A screen registers how Back unwinds its own sub-screens; the handler returns true if it handled it. */
  registerBack(fn: (() => boolean) | null): void;
  draft(key: string): string;
  setDraft(key: string, value: string): void;
  clearDraft(key: string): void;
  clearDrafts(prefix: string): void;
  draftsReady: boolean;
  incoming: Incoming | null;
  receive(i: Incoming | null): void;
}
const C = createContext<Ctx | null>(null);
export function useNav(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("outside NavProvider");
  return v;
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const { svc, root } = useStore();
  const accountId = root.me.accountId;
  const [screen, setScreen] = useState<Screen>("home");
  const [nonce, setNonce] = useState(0);
  const param = useRef<string | null>(null);
  const sub = useRef<(() => boolean) | null>(null);
  const drafts = useRef<Record<string, string>>({});
  const [dv, bump] = useState(0);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [incoming, setIncoming] = useState<Incoming | null>(null);

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    svc.saveDrafts(accountId, drafts.current).catch(() => undefined);
  }, [svc, accountId]);

  useEffect(() => {
    let live = true;
    svc.loadDrafts(accountId).then((d) => { if (live) { drafts.current = { ...d, ...drafts.current }; setReady(true); bump((n) => n + 1); } }).catch(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [svc, accountId]);

  // Unsent drafts are written when the app goes to the background, because the system may end the process there.
  useEffect(() => {
    const s = AppState.addEventListener("change", (st) => { if (st !== "active") flush(); });
    return () => { s.remove(); flush(); };
  }, [flush]);

  const value = useMemo<Ctx>(() => ({
    screen,
    go: (s, p) => { sub.current = null; param.current = p ?? null; setScreen(s); setNonce((n) => n + 1); },
    navNonce: nonce,
    takeParam: () => { const v = param.current; param.current = null; return v; },
    back: () => {
      if (sub.current && sub.current()) return true;
      if (screen !== "home") { sub.current = null; param.current = null; setScreen("home"); setNonce((n) => n + 1); return true; }
      return false;
    },
    registerBack: (fn) => { sub.current = fn; },
    draft: (k) => drafts.current[k] ?? "",
    setDraft: (k, v) => {
      drafts.current = { ...drafts.current, [k]: v };
      bump((n) => n + 1);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 1200);
    },
    clearDraft: (k) => { const { [k]: _gone, ...rest } = drafts.current; void _gone; drafts.current = rest; bump((n) => n + 1); flush(); },
    clearDrafts: (prefix) => { drafts.current = Object.fromEntries(Object.entries(drafts.current).filter(([k]) => !k.startsWith(prefix))); bump((n) => n + 1); flush(); },
    draftsReady: ready,
    incoming,
    receive: setIncoming
  }), [screen, nonce, ready, incoming, flush, dv]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

/**
 * Local sub-screen state that the system Back button/gesture unwinds one step at a time,
 * before it leaves the screen. `root` is the state Back returns to.
 */
export function useView<V extends { k: string }>(root: V, initial?: V): [V, (v: V) => void] {
  const nav = useNav();
  const [view, setView] = useState<V>(initial ?? root);
  useEffect(() => {
    nav.registerBack(() => {
      if (view.k !== root.k) { setView(root); return true; }
      return false;
    });
    return () => nav.registerBack(null);
  });
  return [view, setView];
}

/** A draft-backed text field value. Survives the app being closed by the system (sealed at rest); cleared by `clearDraft`. */
export function useDraft(key: string): [string, (v: string) => void] {
  const nav = useNav();
  return [nav.draft(key), (v: string) => nav.setDraft(key, v)];
}
