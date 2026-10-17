import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Animated, AccessibilityInfo, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, findNodeHandle, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./design/Icon";
import { useReducedMotion, useTheme } from "./design/theme";
import { radius, space, TOUCH, type, type Variant } from "./design/tokens";

// ---- text scale: in-app setting x optional ?fontscale= (web tests). The Android system font scale applies on top (allowFontScaling is never turned off).
export type TextSize = "normal" | "large" | "xl";
export const TEXT_SIZES: ReadonlyArray<{ id: TextSize; label: string; factor: number }> = [
  { id: "normal", label: "Normal", factor: 1 },
  { id: "large", label: "Large", factor: 1.15 },
  { id: "xl", label: "Extra large", factor: 1.3 }
];
/** Largest total (in-app x system) text scale the layouts are built and tested for. */
export const MAX_TOTAL_SCALE = 2;
export const TextScaleContext = createContext<number>(1);
export function useScale() { return useContext(TextScaleContext); }

type Legacy = "h1" | "h2";
const alias: Record<Legacy, Variant> = { h1: "title", h2: "heading" };

export function Txt(p: { v?: Variant | Legacy; children: React.ReactNode; color?: string; style?: StyleProp<TextStyle>; header?: boolean; selectable?: boolean; label?: string; live?: boolean; align?: "left" | "center" | "right"; testID?: string }) {
  const f0 = useScale();
  const c = useTheme();
  const v: Variant = p.v ? (alias[p.v as Legacy] ?? (p.v as Variant)) : "body";
  // Display figures and titles are already large: cap their growth so a word never breaks across lines.
  const f = v === "display" ? Math.min(f0, 1.25) : v === "title" ? Math.min(f0, 1.5) : f0;
  const t = type[v];
  return (
    <Text
      testID={p.testID}
      accessibilityRole={p.header ? "header" : undefined}
      accessibilityLabel={p.label}
      accessibilityLiveRegion={p.live ? "polite" : undefined}
      selectable={p.selectable}
      maxFontSizeMultiplier={v === "display" || v === "title" ? 1.5 : undefined}
      style={[{ color: p.color ?? c.text, fontSize: t.size * f, lineHeight: t.line * f, fontWeight: t.weight, textAlign: p.align }, p.style]}
    >{p.children}</Text>
  );
}

export function Gap({ n = space.m }: { n?: number }) { return <View style={{ height: n }} />; }

export type Tone = "info" | "ok" | "wait" | "bad";
function toneColors(c: ReturnType<typeof useTheme>, tone: Tone) {
  return tone === "ok" ? { bg: c.okBg, fg: c.okText, icon: c.okIcon, name: "ok" as IconName }
    : tone === "wait" ? { bg: c.warnBg, fg: c.warnText, icon: c.warnIcon, name: "wait" as IconName }
    : tone === "bad" ? { bg: c.badBg, fg: c.badText, icon: c.badIcon, name: "warn" as IconName }
    : { bg: c.infoBg, fg: c.infoText, icon: c.infoText, name: "info" as IconName };
}

export function Card({ children, tone, style, accessibilityLabel }: { children: React.ReactNode; tone?: Tone; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const c = useTheme();
  const bg = tone ? toneColors(c, tone).bg : c.surface;
  return <View accessibilityLabel={accessibilityLabel} style={[{ backgroundColor: bg, borderRadius: radius.l, padding: space.m, marginBottom: space.m, borderWidth: 1, borderColor: tone ? "transparent" : c.line }, style]}>{children}</View>;
}

export type ButtonKind = "primary" | "secondary" | "quiet" | "danger";
export function Btn(p: { label: string; onPress: () => void; kind?: ButtonKind; selected?: boolean; hint?: string; role?: "button" | "radio" | "checkbox"; disabled?: boolean; icon?: IconName; id?: string; big?: boolean }) {
  const c = useTheme();
  const f = useScale();
  const kind = p.kind ?? "primary";
  const filled = kind === "primary" || kind === "danger" || (!!p.selected && p.role === "radio");
  const bg = p.selected && p.role === "radio" ? c.primary : kind === "primary" ? c.primary : kind === "danger" ? c.dangerSolid : "transparent";
  const fg = kind === "danger" ? c.onDangerSolid : filled ? c.onPrimary : c.primary;
  return (
    <Pressable
      testID={p.id}
      accessibilityRole={p.role ?? "button"}
      accessibilityLabel={p.label}
      accessibilityHint={p.hint}
      accessibilityState={{ selected: p.role ? undefined : !!p.selected, checked: p.role ? !!p.selected : undefined, disabled: !!p.disabled }}
      aria-checked={p.role ? !!p.selected : undefined}
      disabled={p.disabled}
      onPress={() => p.onPress()}
      android_ripple={{ color: c.line, borderless: false }}
      style={({ pressed }) => [{
        minHeight: (p.big ? 64 : TOUCH + 4), paddingVertical: p.big ? 16 : 12, paddingHorizontal: space.m, borderRadius: radius.m, backgroundColor: bg,
        flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: space.xs, opacity: p.disabled ? 0.45 : pressed ? 0.85 : 1, gap: 10
      }, kind === "secondary" && !(p.selected && p.role === "radio") ? { borderWidth: 2, borderColor: c.primary } : null]}
    >
      {p.icon ? <Icon name={p.icon} size={(p.big ? 26 : 22) * Math.min(f, 1.5)} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: (p.big ? 19 : 16) * f, lineHeight: (p.big ? 26 : 22) * f, fontWeight: "700", textAlign: "center", flexShrink: 1 }}>{p.label}</Text>
    </Pressable>
  );
}

/** Square 48 dp icon-only button; the label is read by TalkBack and is the web aria-label. */
export function IconBtn({ icon, label, onPress, color }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} android_ripple={{ color: c.line, borderless: true, radius: 26 }}
      style={({ pressed }) => ({ width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center", borderRadius: TOUCH / 2, opacity: pressed ? 0.7 : 1 })}>
      <Icon name={icon} size={24} color={color ?? c.text} />
    </Pressable>
  );
}

/** A choice in a list (radio or checkbox). Label and detail are both inside the accessible name. */
export function Choice({ label, detail, selected, onPress, role = "radio" }: { label: string; detail?: string; selected: boolean; onPress: () => void; role?: "radio" | "checkbox" }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      android_ripple={{ color: c.line }}
      style={{ minHeight: TOUCH + 4, flexDirection: "row", gap: 12, alignItems: "flex-start", padding: space.s, borderRadius: radius.m, borderWidth: 2, borderColor: selected ? c.primary : c.line, backgroundColor: selected ? c.primaryContainer : c.surface, marginBottom: space.xs }}
    >
      <View style={{ paddingTop: 2 }}>
        <View style={{ width: 22, height: 22, borderRadius: role === "radio" ? 11 : 5, borderWidth: 2, borderColor: selected ? c.primary : c.inputBorder, alignItems: "center", justifyContent: "center", backgroundColor: selected && role === "checkbox" ? c.primary : "transparent" }}>
          {selected ? (role === "radio" ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /> : <Text style={{ color: c.onPrimary, fontSize: 14, lineHeight: 16, fontWeight: "700" }}>{"✓"}</Text>) : null}
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="body" style={{ fontWeight: "600" }} color={selected ? c.onPrimaryContainer : c.text}>{label}</Txt>
        {detail ? <Txt v="small" color={selected ? c.onPrimaryContainer : c.textMuted}>{detail}</Txt> : null}
      </View>
    </Pressable>
  );
}

/** Status: icon + words (never colour alone). */
export function Chip({ tone, text }: { tone: Tone; text: string }) {
  const c = useTheme();
  const t = toneColors(c, tone);
  const icon: IconName = tone === "ok" ? "ok" : tone === "bad" ? "warn" : tone === "wait" ? "wait" : "info";
  return (
    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "flex-start", backgroundColor: t.bg, borderRadius: radius.m, paddingHorizontal: space.s, paddingVertical: 6, marginVertical: 3, gap: 8, maxWidth: "100%" }}>
      <View style={{ paddingTop: 2 }}><Icon name={icon} size={18} color={t.icon} /></View>
      <View style={{ flexShrink: 1 }}><Txt v="label" color={t.fg}>{text}</Txt></View>
    </View>
  );
}

export function Field(p: { label: string; value: string; onChange: (t: string) => void; multiline?: boolean; placeholder?: string; help?: string; error?: string | null; secure?: boolean; onSubmit?: () => void; autoFocus?: boolean }) {
  const c = useTheme();
  const f = useScale();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: space.m }}>
      <Txt v="label">{p.label}</Txt>
      {p.help ? <Txt v="small" color={c.textMuted}>{p.help}</Txt> : null}
      <TextInput
        testID={`field-${p.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
        accessibilityLabel={p.label}
        value={p.value}
        onChangeText={p.onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        multiline={p.multiline}
        autoFocus={p.autoFocus}
        secureTextEntry={p.secure}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType={p.multiline ? "default" : "done"}
        blurOnSubmit={!p.multiline}
        onSubmitEditing={p.onSubmit}
        placeholder={p.placeholder}
        placeholderTextColor={c.placeholder}
        style={{ minHeight: p.multiline ? 140 : TOUCH + 4, backgroundColor: c.surface, borderRadius: radius.m, borderWidth: focus || p.error ? 3 : 2, borderColor: p.error ? c.badIcon : focus ? c.primary : c.inputBorder, paddingHorizontal: space.s, paddingVertical: 10, fontSize: 16 * f, lineHeight: 24 * f, color: c.text, marginTop: 4, textAlignVertical: p.multiline ? "top" : "center" }}
      />
      {p.error ? <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={{ flexDirection: "row", gap: 6, marginTop: 4, alignItems: "flex-start" }}><View style={{ paddingTop: 2 }}><Icon name="warn" size={18} color={c.badIcon} /></View><View style={{ flexShrink: 1 }}><Txt v="small" color={c.badText} style={{ fontWeight: "600" }}>{p.error}</Txt></View></View> : null}
    </View>
  );
}

/** A read-only text box for codes and shared text, selectable so it can be copied by hand. */
export function ReadBox({ label, value }: { label: string; value: string }) {
  const c = useTheme();
  const f = useScale();
  return (
    <TextInput
      testID={`field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
      accessibilityLabel={label}
      value={value}
      editable={false}
      multiline
      selectTextOnFocus
      style={{ minHeight: 96, maxHeight: 160, borderWidth: 2, borderColor: c.line, borderRadius: radius.m, backgroundColor: c.surfaceAlt, padding: space.s, fontSize: 14 * f, lineHeight: 20 * f, color: c.text, marginBottom: space.s, ...(Platform.OS === "web" ? ({ wordBreak: "break-all" } as object) : {}) }}
    />
  );
}

/**
 * A modal dialog. Back (system or Escape) = "No". Focus moves to the title when it opens and returns to the control that opened it.
 * Both choices are real buttons; nothing needs a swipe.
 */
export function ConfirmCard(p: { title: string; body: string | string[]; yes: string; no: string; onYes: () => void; onNo: () => void; danger?: boolean; extra?: React.ReactNode }) {
  const c = useTheme();
  const titleRef = useRef<any>(null);
  const opener = useRef<unknown>(null);
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") opener.current = document.activeElement;
    const t = setTimeout(() => {
      if (Platform.OS === "web") (titleRef.current as unknown as HTMLElement | null)?.focus?.();
      else { const h = findNodeHandle(titleRef.current); if (h) AccessibilityInfo.setAccessibilityFocus(h); }
    }, 60);
    return () => { clearTimeout(t); if (Platform.OS === "web") (opener.current as HTMLElement | null)?.focus?.(); };
  }, []);
  const lines = Array.isArray(p.body) ? p.body : [p.body];
  return (
    <Modal transparent visible animationType="fade" onRequestClose={p.onNo} statusBarTranslucent>
      <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: c.scrim, justifyContent: "center", padding: space.m }}>
        <View style={{ maxHeight: "92%", backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line }}>
          <ScrollView contentContainerStyle={{ padding: space.m, gap: space.xs }} keyboardShouldPersistTaps="handled">
            <Text ref={titleRef} accessibilityRole="header" {...(Platform.OS === "web" ? ({ tabIndex: -1 } as object) : { accessible: true, focusable: true })} style={{ color: c.text, fontSize: type.heading.size, fontWeight: "700", lineHeight: type.heading.line, marginBottom: space.xs }}>{p.title}</Text>
            {lines.map((l, i) => <Txt key={i}>{l}</Txt>)}
            {p.extra}
            <Gap n={space.s} />
            <Btn label={p.yes} kind={p.danger ? "danger" : "primary"} onPress={p.onYes} />
            <Btn label={p.no} kind="secondary" onPress={p.onNo} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function Notice({ text, tone = "info", title }: { text: string; tone?: Tone; title?: string }) {
  const c = useTheme();
  const t = toneColors(c, tone);
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: space.xs, backgroundColor: t.bg, borderRadius: radius.m, padding: space.s, marginBottom: space.m, alignItems: "flex-start" }}>
      <View style={{ paddingTop: 2 }}><Icon name={tone === "ok" ? "ok" : tone === "bad" ? "warn" : tone === "wait" ? "wait" : "info"} size={20} color={t.icon} /></View>
      <View style={{ flexShrink: 1 }}>
        {title ? <Txt v="label" color={t.fg}>{title}</Txt> : null}
        <Txt v="small" color={t.fg}>{text}</Txt>
      </View>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: space.l, paddingHorizontal: space.s }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.primaryContainer, alignItems: "center", justifyContent: "center", marginBottom: space.s }}><Icon name={icon} size={28} color={c.onPrimaryContainer} /></View>
      <Txt v="heading" align="center" header>{title}</Txt>
      <Txt color={c.textMuted} align="center">{body}</Txt>
      {action ? <View style={{ alignSelf: "stretch", marginTop: space.m }}>{action}</View> : null}
    </View>
  );
}

export function Loading({ text }: { text: string }) {
  const c = useTheme();
  return <View accessibilityRole="progressbar" accessibilityLabel={text} accessibilityLiveRegion="polite" style={{ padding: space.l, alignItems: "center" }}><Txt color={c.textMuted}>{text}</Txt></View>;
}

/** Persistent strip for anything that is a demonstration or example (never for ordinary use). */
export function DemoStrip({ text }: { text: string }) {
  const c = useTheme();
  return (
    <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 8, backgroundColor: c.warnBg, borderRadius: radius.m, paddingHorizontal: space.s, paddingVertical: 8, marginBottom: space.m, alignItems: "flex-start" }}>
      <View style={{ paddingTop: 2 }}><Icon name="info" size={18} color={c.warnIcon} /></View>
      <View style={{ flexShrink: 1 }}><Txt v="small" color={c.warnText}>{text}</Txt></View>
    </View>
  );
}

export function Collapsible({ title, children, open: initial = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  const c = useTheme();
  return (
    <View>
      <Pressable
        accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(!open)}
        style={{ minHeight: TOUCH, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.xs, gap: 8 }}>
        <View style={{ flexShrink: 1 }}><Txt v="label" color={c.primary}>{title}</Txt></View>
        <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}><Icon name="chevron" size={22} color={c.primary} /></View>
      </Pressable>
      {open ? <Card>{children}</Card> : null}
    </View>
  );
}

/** A tappable row that opens something (chevron at the end). */
export function LinkRow({ icon, title, detail, onPress, badge }: { icon: IconName; title: string; detail?: string; onPress: () => void; badge?: string }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} android_ripple={{ color: c.line }}
      style={{ minHeight: TOUCH + 8, flexDirection: "row", alignItems: "center", gap: space.s, padding: space.s, borderRadius: radius.m, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, marginBottom: space.xs }}>
      <Icon name={icon} size={24} color={c.primary} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="body" style={{ fontWeight: "600" }}>{title}</Txt>
        {detail ? <Txt v="small" color={c.textMuted}>{detail}</Txt> : null}
      </View>
      {badge ? <View style={{ backgroundColor: c.primary, borderRadius: 12, minWidth: 24, paddingHorizontal: 6, paddingVertical: 2, alignItems: "center" }}><Txt v="label" color={c.onPrimary}>{badge}</Txt></View> : null}
      <Icon name="chevron" size={22} color={c.textMuted} />
    </Pressable>
  );
}

/** A bullet list in one text block (keeps long lists readable and cheap to render). */
export function Bullets({ items, color }: { items: string[]; color?: string }) {
  return <View style={{ gap: 6 }}>{items.map((t, i) => <View key={i} style={{ flexDirection: "row", gap: 8 }}><Txt color={color}>{"•"}</Txt><View style={{ flex: 1, minWidth: 0 }}><Txt color={color}>{t}</Txt></View></View>)}</View>;
}

/** Subtle screen transition: fade + 8 px rise. Skipped when the user asked for reduced motion. */
export function Transition({ id, children, style }: { id: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const a = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { a.setValue(1); return; }
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== "web" }).start();
  }, [id, reduce, a]);
  return <Animated.View style={[{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }, style]}>{children}</Animated.View>;
}
