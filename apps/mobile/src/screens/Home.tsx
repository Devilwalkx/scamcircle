import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { Btn, Banner, Card, T } from "../ui";
import { OutcomeChip } from "../common";
import { TEXT_SIZES, colors, space, type TextSizeId } from "../theme";
import { useStore } from "../store";
import { SYNTHETIC_NOTICE, loadSyntheticExample } from "@scamcircle/core";

export type Section = "home" | "check" | "people" | "waiting" | "settings";

export function Home({ go, openCase, textSize, setTextSize }: { go: (s: Section) => void; openCase: (id: string) => void; textSize: TextSizeId; setTextSize: (t: TextSizeId) => void }) {
  const { root, now, updateRoot } = useStore();
  const me = root.me;
  const waiting = me.inbox.filter((i) => i.status === "open" && i.replies.length === 0 && now() <= i.expiresAt).length;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: space.lg * 2 }}>
        <View style={{ marginBottom: space.md }}>
          <T v="h1" role="header">◯ ScamCircle</T>
          <T v="muted">Check a message. Then check it another way.</T>
        </View>
        <Banner text={SYNTHETIC_NOTICE} />
        <Btn kind="primary" label="Check a message" onPress={() => go("check")} />
        <Btn label="My trusted people" onPress={() => go("people")} />
        <Btn label={waiting ? `Messages waiting for me (${waiting})` : "Messages waiting for me"} onPress={() => go("waiting")} />
        <Btn label="Settings and privacy" onPress={() => go("settings")} />

        <T v="h2" role="header" style={{ marginTop: space.md, marginBottom: space.sm }}>Recent checks</T>
        {me.cases.length === 0 ? (
          <Card>
            <T>Nothing here yet. Got a message that feels wrong? Tap “Check a message”.</T>
            <Btn label="See an example first" onPress={() => updateRoot((r) => loadSyntheticExample(r, now()).root)} hint="Loads a made-up example" />
          </Card>
        ) : (
          me.cases.slice(0, 5).map((c) => (
            <Card key={c.id}>
              <T style={{ fontWeight: "700" }}>{c.title}</T>
              <OutcomeChip c={c} now={now()} />
              <Btn label="Open" onPress={() => openCase(c.id)} hint={`Open ${c.title}`} />
            </Card>
          ))
        )}

        <T v="h2" role="header" style={{ marginTop: space.md, marginBottom: space.sm }}>Text size</T>
        <View accessibilityRole="radiogroup">
          {TEXT_SIZES.map((t) => <Btn key={t.id} role="radio" label={t.label} selected={textSize === t.id} onPress={() => setTextSize(t.id)} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
