import React from "react";
import { Platform, TextInput, View } from "react-native";
import { caseOutcome, type CaseRecord, type ReviewItem } from "@scamcircle/core";
import { Btn, Chip, T } from "./ui";
import { colors, radius, useFont } from "./theme";
import { copyText, shareText } from "./transport";

export function OutcomeChip({ c, now }: { c: CaseRecord; now: number }) {
  const o = caseOutcome(c, now);
  if (o.kind === "verification_step_completed") return <Chip tone="ok" symbol="✓" text="Checked another way" />;
  if (o.kind === "pending") return <Chip tone="amber" symbol="⏳" text="Waiting for a reply" />;
  if (o.kind === "indicators_found") return <Chip tone="warn" symbol="⚠" text="Warning signs" />;
  return <Chip tone="neutral" symbol="●" text={c.assessment.outcome === "cannot_assess" ? "Can't tell" : "Not checked yet"} />;
}

export function InboxChip({ it, now }: { it: ReviewItem; now: number }) {
  if (it.status === "revoked") return <Chip tone="neutral" symbol="✕" text="Stopped by sender" />;
  if (now > it.expiresAt) return <Chip tone="neutral" symbol="⌛" text="Expired" />;
  if (it.replies.length) return <Chip tone="ok" symbol="✓" text={`You replied (version ${it.replies[it.replies.length - 1]!.version})`} />;
  return <Chip tone="amber" symbol="⏳" text="Waiting for you" />;
}

/** The code is shown in a read-only text box so it can be selected, and offered as Copy and Share. Nothing is sent by the app. */
export function CodeBox({ label, code, copyLabel = "Copy code", shareLabel = "Share code…" }: { label: string; code: string; copyLabel?: string; shareLabel?: string }) {
  const f = useFont();
  const [msg, setMsg] = React.useState("");
  return (
    <View>
      <TextInput
        accessibilityLabel={label}
        value={code}
        editable={false}
        multiline
        selectTextOnFocus
        style={{ minHeight: 96, maxHeight: 140, borderWidth: 2, borderColor: colors.line, borderRadius: radius, backgroundColor: colors.card, padding: 10, fontSize: Math.max(13, f.small - 2), color: colors.text, marginBottom: 12, ...(Platform.OS === "web" ? ({ wordBreak: "break-all" } as object) : {}) }}
      />
      <Btn label={copyLabel} kind="primary" onPress={async () => setMsg((await copyText(code)) ? "Copied. Now paste it into a message to them." : "Could not copy. Select the text above and copy it.")} />
      <Btn label={shareLabel} onPress={async () => setMsg((await shareText(code)) ? "Choose who to send it to in the share menu. Nothing is sent until you do." : "Could not open sharing. Use Copy instead.")} />
      {msg ? <T v="muted" role="alert">{msg}</T> : null}
    </View>
  );
}

export function when(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
