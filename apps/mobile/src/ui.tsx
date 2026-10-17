import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View, type TextStyle, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, space, useFont } from "./theme";

export type Variant = "h1" | "h2" | "body" | "small" | "muted";

export function T({ v = "body", children, style, selectable, role, label, align }: { v?: Variant; children: React.ReactNode; style?: TextStyle; selectable?: boolean; role?: "header" | "alert" | "text"; label?: string; align?: "center" }) {
  const f = useFont();
  const size = v === "h1" ? f.h1 : v === "h2" ? f.h2 : v === "small" || v === "muted" ? f.small : f.body;
  const st: TextStyle = {
    fontSize: size, lineHeight: Math.round(size * 1.4),
    color: v === "muted" ? colors.muted : colors.text, fontWeight: v === "h1" || v === "h2" ? "700" : "400", textAlign: align, flexShrink: 1, ...style
  };
  return (
    <Text style={st} selectable={selectable} accessibilityRole={role === "text" ? undefined : role} aria-label={label} {...(Platform.OS === "web" && role === "header" ? { "aria-level": v === "h1" ? 1 : 2 } : {})}>
      {children}
    </Text>
  );
}

export function Card({ children, tone = "plain", style }: { children: React.ReactNode; tone?: "plain" | "warn" | "amber" | "ok" | "accent"; style?: ViewStyle }) {
  const bg = tone === "warn" ? colors.warnBg : tone === "amber" ? colors.amberBg : tone === "ok" ? colors.okBg : tone === "accent" ? colors.accentSoft : colors.card;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius, padding: space.md, marginBottom: space.md, gap: space.sm, shadowColor: "#1B2B44", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, ...style }}>
      {children}
    </View>
  );
}

export function Btn({ label, onPress, kind = "secondary", hint, selected, disabled, role }: { label: string; onPress: () => void; kind?: "primary" | "secondary" | "danger" | "link"; hint?: string; selected?: boolean; disabled?: boolean; role?: "button" | "radio" | "checkbox" }) {
  const f = useFont();
  const [focus, setFocus] = useState(false);
  const bg = kind === "primary" ? colors.accent : kind === "danger" ? colors.warnText : "transparent";
  const fg = kind === "primary" || kind === "danger" ? colors.onAccent : colors.accent;
  const border = kind === "link" ? "transparent" : kind === "secondary" ? colors.accent : bg;
  return (
    <Pressable
      accessibilityRole={role ?? "button"}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled, selected: selected, checked: role ? !!selected : undefined }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        minHeight: 52, paddingVertical: 14, paddingHorizontal: space.md, borderRadius: radius, borderWidth: 2, borderColor: focus ? colors.text : border,
        backgroundColor: selected ? colors.accentSoft : bg, justifyContent: "center", alignItems: "center", opacity: disabled ? 0.5 : 1, marginBottom: 12, alignSelf: "stretch"
      }}
    >
      <Text style={{ fontSize: f.button, lineHeight: f.line(18), fontWeight: "700", color: selected && kind !== "primary" ? colors.accent : fg, textAlign: "center", flexShrink: 1 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ label, detail, selected, onPress, role = "radio" }: { label: string; detail?: string; selected: boolean; onPress: () => void; role?: "radio" | "checkbox" }) {
  const f = useFont();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      accessibilityState={{ checked: selected, selected }}
      onPress={onPress}
      style={{ minHeight: 52, flexDirection: "row", gap: 12, alignItems: "center", padding: 12, borderRadius: radius, borderWidth: 2, borderColor: selected ? colors.accent : colors.line, backgroundColor: selected ? colors.accentSoft : colors.card, marginBottom: 10 }}
    >
      <Text style={{ fontSize: f.button, color: colors.accent, fontWeight: "700" }}>{selected ? "●" : "○"}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: f.body, lineHeight: f.line(17), color: colors.text, fontWeight: "600", flexShrink: 1 }}>{label}</Text>
        {detail ? <Text style={{ fontSize: f.small, lineHeight: f.line(15), color: colors.muted, flexShrink: 1 }}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

export type ChipTone = "warn" | "amber" | "ok" | "neutral";
export function Chip({ tone, symbol, text }: { tone: ChipTone; symbol: string; text: string }) {
  const f = useFont();
  const [bg, fg] = tone === "warn" ? [colors.warnBg, colors.warnText] : tone === "amber" ? [colors.amberBg, colors.amberText] : tone === "ok" ? [colors.okBg, colors.okText] : [colors.neutralBg, colors.neutralText];
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: bg, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: fg }}>
      <Text style={{ fontSize: f.chip, lineHeight: f.line(14), fontWeight: "700", color: fg, flexShrink: 1 }}>{`${symbol} ${text}`}</Text>
    </View>
  );
}

export function Field({ label, value, onChangeText, multiline, placeholder, hint, secure }: { label: string; value: string; onChangeText: (s: string) => void; multiline?: boolean; placeholder?: string; hint?: string; secure?: boolean }) {
  const f = useFont();
  return (
    <View style={{ marginBottom: space.md }}>
      <T v="body" style={{ fontWeight: "700", marginBottom: 4 }}>{label}</T>
      {hint ? <T v="muted" style={{ marginBottom: 6 }}>{hint}</T> : null}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#5B6B80"
        secureTextEntry={secure}
        autoCorrect={false}
        autoCapitalize="none"
        style={{ minHeight: multiline ? 140 : 52, textAlignVertical: multiline ? "top" : "center", borderWidth: 2, borderColor: colors.line, borderRadius: radius, backgroundColor: colors.card, padding: 12, fontSize: f.body, lineHeight: f.line(17), color: colors.text }}
      />
    </View>
  );
}

export function Banner({ text }: { text: string }) {
  const f = useFont();
  return (
    <View style={{ backgroundColor: colors.amberBg, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: space.md }} accessible accessibilityRole="alert">
      <Text style={{ fontSize: f.small, lineHeight: f.line(15), color: colors.amberText, fontWeight: "600", flexShrink: 1 }}>{`ⓘ ${text}`}</Text>
    </View>
  );
}

/** Every screen except Home: a Back to home button first, then a title, then content. Safe-area padded on all edges. */
export function Screen({ title, onHome, children, step }: { title: string; onHome?: () => void; children: React.ReactNode; step?: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: space.lg * 2 }} keyboardShouldPersistTaps="handled">
        {onHome ? <Btn kind="link" label="‹ Back to home" onPress={onHome} /> : null}
        {step ? <T v="muted" style={{ marginBottom: 4 }}>{step}</T> : null}
        <T v="h1" role="header" style={{ marginBottom: space.md }}>{title}</T>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Big two-button confirmation that restates exactly what will happen. */
export function ConfirmCard({ title, lines, confirmLabel, cancelLabel = "Go back", onConfirm, onCancel, danger }: { title: string; lines: string[]; confirmLabel: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <Card tone="amber">
      <T v="h2" role="header">{title}</T>
      {lines.map((l, i) => <T key={i}>{l}</T>)}
      <Btn kind={danger ? "danger" : "primary"} label={confirmLabel} onPress={onConfirm} />
      <Btn kind="secondary" label={cancelLabel} onPress={onCancel} />
    </Card>
  );
}
