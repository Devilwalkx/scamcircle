import React, { useState } from "react";
import { caseOutcome, type CaseRecord, type ReviewItem } from "@scamcircle/core";
import { Btn, Chip, ReadBox, Txt } from "./ui";
import { copyText, shareText } from "./transport";

/** Status for a saved check. A completed check is shown as information, not as a green all-clear: the person may have learned it IS a scam. */
export function OutcomeChip({ c, now }: { c: CaseRecord; now: number }) {
  const o = caseOutcome(c, now);
  if (o.kind === "verification_step_completed") return <Chip tone="info" text="You checked this another way" />;
  if (o.kind === "pending") return <Chip tone="wait" text="Waiting for a reply" />;
  if (o.kind === "indicators_found") return <Chip tone="bad" text="Warning signs found" />;
  return <Chip tone="wait" text={c.assessment.outcome === "cannot_assess" ? "Could not read enough to tell" : "Not checked another way yet"} />;
}

export function InboxChip({ it, now }: { it: ReviewItem; now: number }) {
  if (it.status === "revoked") return <Chip tone="info" text="Stopped by the sender" />;
  if (now > it.expiresAt) return <Chip tone="info" text="Expired" />;
  if (it.replies.length) return <Chip tone="ok" text={`You replied (version ${it.replies[it.replies.length - 1]!.version})`} />;
  return <Chip tone="wait" text="Waiting for you" />;
}

/**
 * Text shown in a read-only box so it can be selected, and offered as Copy and Share. Nothing is sent by the app:
 * Share opens the phone's own share sheet and the person picks the app and the recipient.
 */
export function CodeBox({ label, code, copyLabel = "Copy", shareLabel = "Share…", sayCopied = "Copied. Paste it into a message yourself." }: { label: string; code: string; copyLabel?: string; shareLabel?: string; sayCopied?: string }) {
  const [msg, setMsg] = useState("");
  return (
    <>
      <ReadBox label={label} value={code} />
      <Btn label={copyLabel} icon="copy" kind="secondary" onPress={async () => setMsg((await copyText(code)) ? sayCopied : "Could not copy. Select the text above and copy it by hand.")} />
      <Btn label={shareLabel} icon="share" onPress={async () => setMsg((await shareText(code)) ? "The share sheet was opened. You choose the app and the person. ScamCircle cannot see whether it was sent." : "Could not open the share sheet. Use Copy instead.")} />
      {msg ? <Txt v="small" live>{msg}</Txt> : null}
    </>
  );
}

export function when(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
