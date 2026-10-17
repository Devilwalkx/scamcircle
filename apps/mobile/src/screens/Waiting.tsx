import React, { useState } from "react";
import { View } from "react-native";
import { VERIFICATION_METHODS, STEP_OUTCOMES, importMessage, respond, deleteInboxItem, type ReviewItem, type StepOutcome } from "@scamcircle/core";
import { Btn, Card, Chip, ConfirmCard, Field, Row, Screen, T } from "../ui";
import { CodeBox, InboxChip, when } from "../common";
import { colors } from "../theme";
import { useStore } from "../store";
import { pasteText } from "../transport";

type V = { v: "list" } | { v: "open"; id: string } | { v: "reply"; id: string };

export function Waiting({ onHome }: { onHome: () => void }) {
  const { dev, now, updateDev, updateRoot, viewer, root } = useStore();
  const [view, setView] = useState<V>({ v: "list" });
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [method, setMethod] = useState("");
  const [outcome, setOutcome] = useState<StepOutcome | "">("");
  const [findings, setFindings] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [reply, setReply] = useState<{ code: string; version: number } | null>(null);
  const [handed, setHanded] = useState(false);

  const open = (id: string) => { setMethod(""); setOutcome(""); setFindings(""); setConfirm(false); setReply(null); setHanded(false); setView({ v: "open", id }); };

  if (view.v === "open" || view.v === "reply") {
    const it: ReviewItem | undefined = dev.inbox.find((i) => i.grantId === view.id);
    if (!it) return <Screen title="Not found" onHome={onHome}><Btn label="Back" onPress={() => setView({ v: "list" })} /></Screen>;
    const usable = it.status === "open" && now() <= it.expiresAt;
    if (view.v === "reply") {
      if (reply) {
        return (
          <Screen title="Your reply code" onHome={onHome}>
            <Card tone="amber"><T>{`⏳ Not delivered yet. Send this code to ${it.ownerName}. Only they can open it.`}</T></Card>
            <CodeBox label={`Reply code for ${it.ownerName}`} code={reply.code} />
            {viewer === "demo" && !handed ? (
              <Btn label="Hand it back to the owner now" hint="Demo only" onPress={async () => { await updateRoot((r) => { const g = importMessage(r.me, reply.code, now()); return g.ok ? { ...r, me: g.state } : r; }); setHanded(true); }} />
            ) : null}
            {handed ? <T role="alert">✓ Delivered to the owner's side. Switch back to your own view in Settings &gt; Demo options.</T> : null}
            <Btn kind="primary" label="Done" onPress={() => setView({ v: "open", id: it.grantId })} />
          </Screen>
        );
      }
      const m = VERIFICATION_METHODS.find((x) => x.id === method);
      return (
        <Screen title="Your reply" onHome={onHome}>
          <T style={{ marginBottom: 8 }}>A thumbs-up is not a check. Say how you checked and what you found.</T>
          <T v="h2" role="header" style={{ marginBottom: 6 }}>How did you check?</T>
          {VERIFICATION_METHODS.map((x) => <Row key={x.id} label={x.label} detail={x.independent ? undefined : x.why} selected={method === x.id} onPress={() => setMethod(x.id)} />)}
          <T v="h2" role="header" style={{ marginVertical: 6 }}>What happened?</T>
          {STEP_OUTCOMES.map((o) => <Row key={o.id} label={o.label} selected={outcome === o.id} onPress={() => setOutcome(o.id)} />)}
          <Field label="What did you find?" value={findings} onChangeText={setFindings} multiline hint="A sentence or two." />
          {confirm && m ? (
            <ConfirmCard title={`Create a reply for ${it.ownerName}?`} confirmLabel="Create the reply code" onCancel={() => setConfirm(false)}
              lines={[`How you checked: ${m.label}.`, `What happened: ${STEP_OUTCOMES.find((o) => o.id === outcome)?.label}.`, `What you wrote: “${findings}”`, m.independent ? "Only they can open the code. It is not sent until you send it." : `This way of checking does not count as a verification: ${m.why}`]}
              onConfirm={async () => {
                const r = respond(dev, it.grantId, { method, outcome: outcome as StepOutcome, findings, checkedAt: now() }, now());
                if (!r.ok) { setMsg({ ok: false, text: r.message }); setConfirm(false); return; }
                await updateDev(() => r.state);
                setReply({ code: r.message, version: r.version });
              }} />
          ) : (
            <Btn kind="primary" label="Review my reply" disabled={!method || !outcome || findings.trim().length < 3} onPress={() => setConfirm(true)} />
          )}
          {msg && !msg.ok ? <T role="alert" style={{ color: colors.warnText }}>{`⚠ ${msg.text}`}</T> : null}
          <Btn kind="link" label="Back" onPress={() => setView({ v: "open", id: it.grantId })} />
        </Screen>
      );
    }
    return (
      <Screen title={`From ${it.ownerName}`} onHome={onHome}>
        <InboxChip it={it} now={now()} />
        {it.status === "revoked" ? <Card><T>The sender stopped this request. The message was removed from this app. Anything you already saw or copied is not affected.</T></Card> : (
          <View>
            <Card tone="accent"><T style={{ fontWeight: "700" }}>Do not use the phone number or link in the message below to check it.</T><T>Call the person on a number you already trust, then reply.</T></Card>
            <Card><T v="h2" role="header">The message</T><T selectable>{it.text}</T></Card>
            {it.note ? <Card><T v="h2" role="header">Their note</T><T>{it.note}</T></Card> : null}
            {it.labels.length ? <Card><T v="h2" role="header">Warning signs they saw</T>{it.labels.map((l) => <T key={l}>{`⚠ ${l}`}</T>)}</Card> : null}
            <T v="muted" style={{ marginBottom: 8 }}>{`Open until ${when(it.expiresAt)}.`}</T>
          </View>
        )}
        {it.replies.map((r) => <Card key={r.version}><T style={{ fontWeight: "700" }}>{`Your reply ${r.version}`}</T><T>{`${VERIFICATION_METHODS.find((m) => m.id === r.method)?.label}. ${STEP_OUTCOMES.find((o) => o.id === r.outcome)?.label}. “${r.findings}”`}</T></Card>)}
        {usable ? <Btn kind="primary" label={it.replies.length ? "Send a newer reply" : "Reply"} onPress={() => setView({ v: "reply", id: it.grantId })} /> : null}
        <Btn label="Delete this" onPress={async () => { await updateDev((d) => deleteInboxItem(d, it.grantId, now())); setView({ v: "list" }); }} />
        <Btn kind="link" label="Back" onPress={() => setView({ v: "list" })} />
      </Screen>
    );
  }

  return (
    <Screen title="Messages waiting for me" onHome={onHome}>
      {viewer === "demo" ? <Card tone="amber"><T>You are looking at the demo helper's side.</T></Card> : null}
      <Field label="Paste a code someone sent you" value={code} onChangeText={(t) => { setCode(t); setMsg(null); }} multiline placeholder="Starts with SCM1." />
      <Btn label="Paste from clipboard" onPress={async () => { const t = await pasteText(); if (t) setCode(t); }} />
      <Btn kind="primary" label="Open the code" disabled={code.trim().length < 6} onPress={async () => {
        const r = importMessage(dev, code, now());
        if (!r.ok) { setMsg({ ok: false, text: r.message }); return; }
        await updateDev(() => r.state);
        setCode("");
        const i = r.imported;
        if (i.kind === "share") { setMsg({ ok: true, text: "✓ A request was added below." }); }
        else if (i.kind === "revoke") setMsg({ ok: true, text: "✓ The sender stopped this request. It was closed here." });
        else setMsg({ ok: true, text: i.cls === "verification_step_completed" ? "✓ Reply added to your message. It reports a check made another way. We cannot confirm that ourselves." : "✓ Reply added. It is not a completed check." });
      }} />
      {msg ? <T role="alert" style={{ color: msg.ok ? colors.okText : colors.warnText, marginBottom: 10 }}>{msg.ok ? msg.text : `⚠ ${msg.text}`}</T> : null}
      {dev.inbox.length === 0 ? <Card><T>Nothing waiting. When someone asks for your help, paste their code above.</T></Card> : dev.inbox.map((it) => (
        <Card key={it.grantId}>
          <T v="h2" role="header">{`From ${it.ownerName}`}</T>
          <InboxChip it={it} now={now()} />
          <Btn label="Open" onPress={() => open(it.grantId)} hint={`Open the request from ${it.ownerName}`} />
        </Card>
      ))}
      {root.demo === null ? null : null}
    </Screen>
  );
}
