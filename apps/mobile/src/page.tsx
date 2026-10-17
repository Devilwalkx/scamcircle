import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Platform, Text, View, findNodeHandle } from "react-native";
import { useTheme } from "./design/theme";
import { space, type } from "./design/tokens";
import { useScale } from "./ui";
import { Txt } from "./ui";

/**
 * Every screen starts with one heading. When it appears, screen-reader focus moves to it (TalkBack reads it first),
 * so a person who cannot see the screen knows where they are. `intro` is one short sentence under the heading.
 */
export function Page({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  const c = useTheme();
  const f = Math.min(useScale(), 1.5);
  const ref = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const t = setTimeout(() => { const h = findNodeHandle(ref.current); if (h) AccessibilityInfo.setAccessibilityFocus(h); }, 200);
    return () => clearTimeout(t);
  }, [title]);
  return (
    <View style={{ flexGrow: 1 }}>
      <Text ref={ref} accessibilityRole="header" {...(Platform.OS === "web" ? ({ "aria-level": 1 } as object) : { accessible: true })} style={{ color: c.text, fontSize: type.title.size * f, lineHeight: type.title.line * f, fontWeight: "700", marginBottom: intro ? space.xxs : space.m }}>{title}</Text>
      {intro ? <View style={{ marginBottom: space.m }}><Txt color={c.textMuted}>{intro}</Txt></View> : null}
      {children}
    </View>
  );
}
