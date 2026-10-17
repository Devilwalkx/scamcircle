import React from "react";
import { View } from "react-native";
import { addExampleCase } from "@scamcircle/core";
import { Btn, Card, Chip, LinkRow, Notice, Txt } from "../ui";
import { Page } from "../page";
import { OutcomeChip } from "../parts";
import { useNav } from "../nav";
import { useStore } from "../store";
import { useTheme } from "../design/theme";
import { space } from "../design/tokens";

/**
 * Why the person opened the app: they have a message they are unsure about. So the one big action, in the middle,
 * is "Check a message". Everything else (recent checks, trusted people, requests) is quieter and below it.
 */
export function Home() {
  const nav = useNav();
  const c = useTheme();
  const { dev, now, updateDev } = useStore();
  const waiting = dev.inbox.filter((i) => i.status === "open" && i.replies.length === 0 && now() <= i.expiresAt).length;
  const cases = dev.cases;
  return (
    <Page title="Not sure about a message?" intro="Paste it here, or share it to ScamCircle from your messages. We point out warning signs, then help you check it another way.">
      <View style={{ flexGrow: cases.length === 0 ? 1 : 0, justifyContent: "center", paddingVertical: space.l }}>
        <Btn big label="Check a message" icon="search" onPress={() => nav.go("check")} id="primary-check" />
        <View style={{ alignItems: "center", marginTop: space.xs }}>
          <Chip tone="info" text="Works without internet. Nothing is sent by the app." />
        </View>
        {cases.length === 0 ? (
          <View style={{ marginTop: space.m }}>
            <Btn kind="quiet" label="See a made-up example" hint="Adds one clearly marked example message you can delete" onPress={async () => {
              const r = addExampleCase(dev, now());
              await updateDev(() => r.state);
              nav.go("check", r.caseId);
            }} />
          </View>
        ) : null}
      </View>

      {cases.length > 0 ? (
        <>
          <Txt v="heading" header style={{ marginBottom: space.xs }}>Recent checks</Txt>
          {cases.slice(0, 5).map((k) => (
            <Card key={k.id}>
              <Txt style={{ fontWeight: "700" }}>{k.title}</Txt>
              {k.source === "demo" ? <Txt v="small" color={c.textMuted}>Made-up example</Txt> : null}
              <OutcomeChip c={k} now={now()} />
              <Btn kind="secondary" label="Open" hint={`Open ${k.title}`} onPress={() => nav.go("check", k.id)} />
            </Card>
          ))}
        </>
      ) : null}

      <Txt v="heading" header style={{ marginTop: space.s, marginBottom: space.xs }}>Ask someone you trust</Txt>
      <LinkRow icon="people" title="Trusted people" detail="Add someone who can look at a message with you" onPress={() => nav.go("people")} />
      <LinkRow icon="inbox" title="Requests for me" detail={waiting ? `${waiting} waiting for you` : "When someone asks you to look at a message"} badge={waiting ? String(waiting) : undefined} onPress={() => nav.go("waiting")} />
      <View style={{ marginTop: space.s }}>
        <Notice title="Test build" text="Not reviewed by anyone independent, so please do not use real private messages yet. It points out warning signs. It cannot confirm that any message is real." />
      </View>
    </Page>
  );
}
