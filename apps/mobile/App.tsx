import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Keyboard, PixelRatio, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaInsetsContext, SafeAreaProvider, SafeAreaView, initialWindowMetrics, useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import type { Root as VaultRoot } from "@scamcircle/core";
import { MAX_CASE_CHARS } from "@scamcircle/core";
import { installSecureRandom } from "./src/secureRandom";
import { platformBlocker } from "./src/platformCheck";
import { StoreProvider, useLoadVault, useStore } from "./src/store";
import { storage } from "./src/storage";
import { NavProvider, useNav, type Screen } from "./src/nav";
import { useShareIn } from "./src/shareIn";
import { Btn, IconBtn, Loading, MAX_TOTAL_SCALE, TEXT_SIZES, TextScaleContext, Transition, Txt, useScale, type TextSize } from "./src/ui";
import { Icon, type IconName } from "./src/design/Icon";
import { ThemeProvider, useTheme, useThemeMode, type ThemePref } from "./src/design/theme";
import { TOUCH, space } from "./src/design/tokens";
import { Home } from "./src/screens/Home";
import { Check } from "./src/screens/Check";
import { People } from "./src/screens/People";
import { Waiting } from "./src/screens/Waiting";
import { Settings } from "./src/screens/Settings";

let startError: string | null = platformBlocker();
if (!startError) {
  try {
    installSecureRandom();
  } catch (e) {
    startError = e instanceof Error ? e.message : "Secure random unavailable";
  }
}

/** On web, `?insets=<top>,<bottom>` simulates Android system bars and `?fontscale=2` simulates a large system font, for automated tests. */
function testInsets(): EdgeInsets | undefined {
  if (typeof window === "undefined" || !window.location?.search) return undefined;
  const m = /[?&]insets=(\d{1,3}),(\d{1,3})/.exec(window.location.search);
  return m ? { top: Number(m[1]), bottom: Number(m[2]), left: 0, right: 0 } : undefined;
}
function queryFontScale(): number {
  if (typeof window === "undefined" || !window.location?.search) return 1;
  const m = /[?&]fontscale=([0-9.]{1,4})/.exec(window.location.search);
  const v = m ? Number(m[1]) : 1;
  return v >= 0.5 && v <= 3 ? v : 1;
}

export default function App() {
  const simulated = testInsets();
  const [size, setSize] = useState<TextSize>("normal");
  const [themePref, setThemePref] = useState<ThemePref>("system");
  useEffect(() => {
    storage.get("sc.textsize").then((v) => { if (v && TEXT_SIZES.some((t) => t.id === v)) setSize(v as TextSize); }).catch(() => undefined);
    storage.get("sc.theme").then((v) => { if (v === "system" || v === "light" || v === "dark") setThemePref(v); }).catch(() => undefined);
  }, []);
  const changeSize = useCallback((t: TextSize) => { setSize(t); storage.set("sc.textsize", t).catch(() => undefined); }, []);
  const changeTheme = useCallback((t: ThemePref) => { setThemePref(t); storage.set("sc.theme", t).catch(() => undefined); }, []);
  // The in-app size multiplies with the phone's own font size (which is never switched off). Above about 2x in total, words stop
  // fitting a phone screen, so the in-app part gives way: in-app x system never exceeds MAX_TOTAL_SCALE.
  const inApp = TEXT_SIZES.find((t) => t.id === size)?.factor ?? 1;
  const query = useMemo(queryFontScale, []);
  const system = Platform.OS === "web" ? 1 : PixelRatio.getFontScale();
  const factor = Platform.OS === "web" ? Math.min(inApp * query, MAX_TOTAL_SCALE) : Math.max(1, Math.min(inApp, MAX_TOTAL_SCALE / system));
  const prefs = useMemo(() => ({ size, setSize: changeSize, themePref, setThemePref: changeTheme }), [size, changeSize, themePref, changeTheme]);
  const inner = (
    <ThemeProvider pref={themePref} setPref={changeTheme}>
      <TextScaleContext.Provider value={factor}><Shell prefs={prefs} /></TextScaleContext.Provider>
    </ThemeProvider>
  );
  if (simulated) return <SafeAreaInsetsContext.Provider value={simulated}>{inner}</SafeAreaInsetsContext.Provider>;
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}>{inner}</SafeAreaProvider>;
}

export interface Prefs { size: TextSize; setSize: (t: TextSize) => void; themePref: ThemePref; setThemePref: (t: ThemePref) => void }

function Fallback({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  const c = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: space.m }} edges={["top", "bottom", "left", "right"]}>
      <Txt v="title" header>{title}</Txt>
      <Txt>{text}</Txt>
      {action}
    </SafeAreaView>
  );
}

function Shell({ prefs }: { prefs: Prefs }) {
  const { state, reload, gen } = useLoadVault();
  const c = useTheme();
  const { mode } = useThemeMode();
  useEffect(() => { SystemUI.setBackgroundColorAsync(c.bg).catch(() => undefined); }, [c.bg]);
  if (startError) return <Fallback title="Cannot start safely" text={`Private storage is disabled on this device: ${startError}`} />;
  if (state.kind === "loading") return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}><StatusBar style={mode === "dark" ? "light" : "dark"} /><Loading text="Opening your private data on this phone…" /></View>;
  if (state.kind === "error") {
    return <Fallback title="Your saved data could not be opened" text={`${state.message} Nothing was shown or changed. If this phone lost its key, restore from a backup with your recovery secret.`} action={<Btn label="Try again" onPress={reload} />} />;
  }
  return <Ready key={gen} initial={state.root} reload={reload} prefs={prefs} />;
}

function Ready({ initial, reload, prefs }: { initial: VaultRoot; reload: () => void; prefs: Prefs }) {
  const onReplace = useCallback((r: VaultRoot | null) => { if (r === null) reload(); }, [reload]);
  return (
    <StoreProvider initial={initial} onReplace={onReplace}>
      <NavProvider><Frame prefs={prefs} /></NavProvider>
    </StoreProvider>
  );
}

const SECTIONS: Record<Screen, string> = { home: "ScamCircle", check: "Check a message", people: "Trusted people", waiting: "Requests for me", settings: "Settings" };
const TABS: Array<{ id: Screen; label: string; icon: IconName; centre?: boolean }> = [
  { id: "people", label: "People", icon: "people" },
  { id: "home", label: "Check", icon: "check", centre: true },
  { id: "waiting", label: "Requests", icon: "inbox" }
];

function Frame({ prefs }: { prefs: Prefs }) {
  const nav = useNav();
  const factor = useScale();
  const { dev, now } = useStore();
  const c = useTheme();
  const { mode } = useThemeMode();
  const insets = useSafeAreaInsets();
  const scroller = useRef<any>(null);
  const [kb, setKb] = useState(0);
  const rootH = useRef(0);
  const beforeKb = useRef(0);

  // Text or a picture sent from another app: put it in the check box and open the check screen.
  const { setDraft, go, receive } = nav;
  useShareIn(useCallback((i) => {
    if (i.text) setDraft("check.text", i.text.slice(0, MAX_CASE_CHARS));
    receive(i);
    go("check");
  }, [setDraft, go, receive]));

  // System Back / predictive back gesture: unwind a sub-screen, then go home, then let the system leave the app.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => nav.back());
    return () => sub.remove();
  });

  // Keyboard: if the window did not already shrink for the keyboard (edge-to-edge), pad the bottom so the focused field and its action stay visible.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      beforeKb.current = rootH.current;
      setTimeout(() => { if (rootH.current >= beforeKb.current - 4) setKb(Math.max(0, e.endCoordinates.height - insets.bottom)); }, 120);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, [insets.bottom]);

  useEffect(() => { scroller.current?.scrollTo({ y: 0, animated: false }); }, [nav.screen, nav.navNonce]);

  const S = nav.screen;
  const waiting = dev.inbox.filter((i) => i.status === "open" && i.replies.length === 0 && now() <= i.expiresAt).length;
  const showNav = kb === 0;
  const activeTab: Screen = S === "check" ? "home" : S;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingBottom: kb }} onLayout={(e) => { rootH.current = e.nativeEvent.layout.height; }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space.xs, minHeight: 56, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.bg }}>
          {S !== "home" ? <IconBtn icon="back" label="Back" onPress={() => nav.back()} /> : <View style={{ width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" }}><Icon name="lock" size={24} color={c.primary} /></View>}
          <Text accessibilityRole="header" numberOfLines={2} style={{ flex: 1, color: c.text, fontSize: 20 * Math.min(factor, 1.4), lineHeight: 26 * Math.min(factor, 1.4), fontWeight: "700", paddingHorizontal: 4 }}>{SECTIONS[S]}</Text>
          {S !== "settings" ? <IconBtn icon="settings" label="Settings" onPress={() => nav.go("settings")} /> : null}
        </View>
        <ScrollView ref={scroller} {...(Platform.OS === "web" ? ({ tabIndex: 0 } as object) : {})} contentContainerStyle={{ padding: space.m, paddingBottom: space.xl, flexGrow: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
          {!nav.draftsReady ? <Loading text="Opening…" /> : (
            <Transition key={`${S}-${nav.navNonce}`} id={`${S}-${nav.navNonce}`} style={{ flexGrow: 1 }}>
              {S === "home" ? <Home /> : S === "check" ? <Check /> : S === "people" ? <People /> : S === "waiting" ? <Waiting /> : <Settings prefs={prefs} />}
            </Transition>
          )}
        </ScrollView>
      </SafeAreaView>
      {showNav ? (
        <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
          {TABS.map((n) => {
            const active = activeTab === n.id;
            const badge = n.id === "waiting" && waiting > 0 ? waiting : 0;
            return (
              <Pressable key={n.id} accessibilityRole="tab" accessibilityState={{ selected: active }} aria-selected={active}
                accessibilityLabel={badge ? undefined : n.label} accessibilityHint={badge ? `${badge} waiting for you` : undefined}
                onPress={() => nav.go(n.id)} android_ripple={{ color: c.line }}
                style={{ flex: 1, minHeight: 64, alignItems: "center", justifyContent: "center", paddingVertical: 6 }}>
                <View style={{ minWidth: n.centre ? 64 : 56, height: n.centre ? 34 : 30, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: n.centre ? c.primary : active ? c.primaryContainer : "transparent" }}>
                  <Icon name={n.icon} size={24} color={n.centre ? c.onPrimary : active ? c.onPrimaryContainer : c.textMuted} />
                </View>
                <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ color: active ? c.text : c.textMuted, fontSize: 14, fontWeight: active ? "700" : "500", marginTop: 2 }}>{n.label}</Text>
                {badge ? <View style={{ position: "absolute", top: 4, left: "50%", marginLeft: 8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.dangerSolid, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}><Text allowFontScaling={false} style={{ color: c.onDangerSolid, fontSize: 11, fontWeight: "700" }}>{badge}</Text></View> : null}
              </Pressable>
            );
          })}
        </View>
      ) : <View style={{ height: kb === 0 ? insets.bottom : 0 }} />}
    </View>
  );
}

