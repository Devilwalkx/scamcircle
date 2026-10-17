import { useEffect, useRef } from "react";
import { AppState, Linking, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import type { Incoming } from "./nav";

/**
 * Receives text and pictures that another app sends to ScamCircle through the Android share sheet.
 * Mechanism: the `expo-sharing` config plugin adds ACTION_SEND intent filters for text/plain and image/* to the
 * main activity. No permission is needed: Android gives this app read access to the one shared item.
 * Only the unresolved payloads are read. The resolving call that expo-sharing also offers can try to fetch web
 * addresses, and this app has no internet permission and never opens links, so it is deliberately not used.
 * A shared web address is treated as text and analysed as text.
 */
export function readIncoming(): Incoming | null {
  try {
    const payloads = Sharing.getSharedPayloads();
    if (!payloads || payloads.length === 0) return null;
    const texts: string[] = [];
    let imageUri: string | undefined;
    for (const p of payloads) {
      if ((p.shareType === "text" || p.shareType === "url") && p.value) texts.push(p.value);
      else if (p.shareType === "image" && p.value && !imageUri) imageUri = p.value;
    }
    if (texts.length === 0 && !imageUri) return null;
    return { text: texts.length ? texts.join("\n") : undefined, imageUri, at: Date.now() };
  } catch {
    return null;
  }
}

/** Web test stand-in: `?sharedtext=...` behaves like text arriving from another app. It tests this app's handling only, not Android. */
function webStandIn(): Incoming | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const m = /[?&]sharedtext=([^&]*)/.exec(window.location?.search ?? "");
  if (!m) return null;
  try { return { text: decodeURIComponent(m[1]!.replace(/\+/g, " ")), at: Date.now(), simulated: true }; } catch { return null; }
}

export function useShareIn(onShare: (i: Incoming) => void) {
  const cb = useRef(onShare);
  cb.current = onShare;
  useEffect(() => {
    const take = () => {
      const i = Platform.OS === "web" ? webStandIn() : readIncoming();
      if (!i) return;
      if (Platform.OS !== "web") { try { Sharing.clearSharedPayloads(); } catch { /* nothing to clear */ } }
      cb.current(i);
    };
    take();
    const app = AppState.addEventListener("change", (st) => { if (st === "active") take(); });
    // When the app is already open, Android delivers a new share as a link event with this app's own share address.
    const link = Linking.addEventListener("url", (e) => { if (e.url.includes("expo-sharing")) take(); });
    return () => { app.remove(); link.remove(); };
  }, []);
}
