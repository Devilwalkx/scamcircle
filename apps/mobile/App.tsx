import React, { useCallback, useEffect, useState } from "react";
import { PixelRatio, Platform, View } from "react-native";
import { SafeAreaInsetsContext, SafeAreaProvider, SafeAreaView, initialWindowMetrics, type EdgeInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { Root } from "@scamcircle/core";
import { installSecureRandom } from "./src/secureRandom";
import { platformBlocker } from "./src/platformCheck";
import { StoreProvider, useLoadVault } from "./src/store";
import { storage } from "./src/storage";
import { Home, type Section } from "./src/screens/Home";
import { Check } from "./src/screens/Check";
import { People } from "./src/screens/People";
import { Waiting } from "./src/screens/Waiting";
import { Settings } from "./src/screens/Settings";
import { Btn, Card, T } from "./src/ui";
import { ScaleProvider, TEXT_SIZES, colors, space, type TextSizeId } from "./src/theme";

const MAX_TOTAL_SCALE = 2;
let startError: string | null = platformBlocker();
if (!startError) {
  try {
    installSecureRandom();
  } catch (e) {
    startError = e instanceof Error ? e.message : "Secure random unavailable";
  }
}

/** On web, `?insets=<top>,<bottom>` simulates Android system bars and `?fontscale=2` simulates a large system font, for automated tests. */
function testParam(re: RegExp): RegExpExecArray | null {
  if (typeof window === "undefined" || !window.location?.search) return null;
  return re.exec(window.location.search);
}
function testInsets(): EdgeInsets | undefined {
  const m = testParam(/[?&]insets=(\d{1,3}),(\d{1,3})/);
  return m ? { top: Number(m[1]), bottom: Number(m[2]), left: 0, right: 0 } : undefined;
}
function testFontScale(): number {
  const m = testParam(/[?&]fontscale=(\d(?:\.\d)?)/);
  return m ? Math.min(3, Math.max(1, Number(m[1]))) : 1;
}

export default function App() {
  const simulated = testInsets();
  const [size, setSize] = useState<TextSizeId>("normal");
  useEffect(() => {
    storage.get("sc.textsize").then((v) => { if (v && TEXT_SIZES.some((t) => t.id === v)) setSize(v as TextSizeId); }).catch(() => undefined);
  }, []);
  const setTextSize = useCallback((t: TextSizeId) => { setSize(t); storage.set("sc.textsize", t).catch(() => undefined); }, []);
  // The in-app size and the phone's own font scale multiply. Above about 2x words stop fitting a phone
  // screen, so the in-app part gives way: total (in-app x system) never exceeds MAX_TOTAL_SCALE.
  const inApp = TEXT_SIZES.find((t) => t.id === size)?.mult ?? 1;
  const system = Platform.OS === "web" ? testFontScale() : PixelRatio.getFontScale();
  const mult = Platform.OS === "web" ? Math.min(inApp * system, MAX_TOTAL_SCALE) : Math.max(1, Math.min(inApp, MAX_TOTAL_SCALE / system));
  const body = <Shell textSize={size} setTextSize={setTextSize} />;
  return (
    <ScaleProvider value={{ mult }}>
      {simulated ? (
        <SafeAreaInsetsContext.Provider value={simulated}>{body}</SafeAreaInsetsContext.Provider>
      ) : (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>{body}</SafeAreaProvider>
      )}
    </ScaleProvider>
  );
}

function Fallback({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: space.md }} edges={["top", "bottom", "left", "right"]}>
      <Card><T v="h1" role="header">{title}</T><T>{text}</T>{action}</Card>
    </SafeAreaView>
  );
}

function Shell({ textSize, setTextSize }: { textSize: TextSizeId; setTextSize: (t: TextSizeId) => void }) {
  const { state, reload, gen } = useLoadVault();
  if (startError) return <Fallback title="Cannot start safely" text={`Private storage is disabled on this device: ${startError}`} />;
  if (state.kind === "loading") return <Fallback title="Opening…" text="Unlocking your private data on this phone." />;
  if (state.kind === "error") {
    return <Fallback title="Your saved data could not be opened" text={`${state.message} Nothing was shown or changed. If this phone lost its key, restore from a backup with your recovery secret.`} action={<Btn label="Try again" onPress={reload} />} />;
  }
  return <Ready key={gen} initial={state.root} reload={reload} textSize={textSize} setTextSize={setTextSize} />;
}

function Ready({ initial, reload, textSize, setTextSize }: { initial: Root; reload: () => void; textSize: TextSizeId; setTextSize: (t: TextSizeId) => void }) {
  const [section, setSection] = useState<Section>("home");
  const [caseId, setCaseId] = useState<string | undefined>();
  const home = useCallback(() => { setSection("home"); setCaseId(undefined); }, []);
  const onReplace = useCallback((r: Root | null) => { if (r === null) { home(); reload(); } }, [home, reload]);
  return (
    <StoreProvider initial={initial} onReplace={onReplace}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="dark" />
        {section === "home" && <Home go={(s) => { setCaseId(undefined); setSection(s); }} openCase={(id) => { setCaseId(id); setSection("check"); }} textSize={textSize} setTextSize={setTextSize} />}
        {section === "check" && <Check key={caseId ?? "new"} onHome={home} initialCase={caseId} goPeople={() => setSection("people")} />}
        {section === "people" && <People onHome={home} />}
        {section === "waiting" && <Waiting onHome={home} />}
        {section === "settings" && <Settings onHome={home} textSize={textSize} setTextSize={setTextSize} />}
      </View>
    </StoreProvider>
  );
}
