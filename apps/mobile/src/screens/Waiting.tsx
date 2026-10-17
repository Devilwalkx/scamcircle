import React, { useRef, useState } from "react";
import { View } from "react-native";
import { VERIFICATION_METHODS, STEP_OUTCOMES, importMessage, respond, deleteInboxItem, type ReviewItem, type StepOutcome } from "@scamcircle/core";
import { Btn, Card, Choice, ConfirmCard, EmptyState, Field, Notice, Txt } from "../ui";
import { Page } from "../page";
import { CodeBox, InboxChip, when } from "../parts";
import { useStore } from "../store";
import { useDraft, useNav, useView } from "../nav";
import { useTheme } from "../design/theme";
import { space } from "../design/tokens";
import { pasteText } from "../transport";

type V = { k: "list" } | { k: "open"; id: string } | { k: "reply"; id: string };

export function Waiting() {
  const { dev, now, updateDev, updateRoot, viewer } = useStore();
  const th = useTheme();
  const nav = useNav();
  const [view, setView] = useView<V>({ k: "list" });
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [method, setMethod] = useState("");
  const [outcome, setOutcome] = useState<StepOutcome | "">("");
  const [findings, setFindings] = useDraft(view.k === "reply" ? `reply.findings.${view.id}` : "reply.findings");
  const [confirm, setConfirm] = useState(false);
  const [reply, setReply] = useState<{ code: string; version: number } | null>(null);
  const [handed, setHanded] = useState(false);
  const busy = useRef(false);

  const open = (id: string) => { setMethod(""); setOutcome(""); setConfirm(false); setReply(null); setHanded(false); setView({ k: "open", id }); };

  if (view.k === "open" || view.k === "reply") {
    const it: ReviewItem | undefined = dev.inbox.find((i) => i.grantId === view.id);
    if (!it) return <Page title="Not found"><Btn label="Back" onPress={() => setView({ k: "list" })} /></Page>;
    const usable = it.status === "open" && now() <= it.expiresAt;
    if (view.k === "reply") {
      if (reply) {
        return (
          <Page title="Your reply code">
            <Card tone="wait"><Txt v="heading" header>Not delivered yet</Txt><Txt>{`Send this code to ${it.ownerName} yourself. Only they can open it. ScamCircle cannot tell whether it arrives.`}</Txt></Card>
            <CodeBox label={`Reply code for ${it.ownerName}`} code={reply.code} />
            {viewer === "demo" && !handed ? (
              <Card tone="wait"><Txt v="label">Demonstration only</Txt><Txt v="small">You are looking at the pretend helper's side on this same phone. Handing it back is a simulation, not real delivery.</Txt>
                <Btn kind="secondary" label="Hand it back to the owner now" onPress={async () => { await updateRoot((r) => { const g = importMessage(r.me, reply.code, now()); return g.ok ? { ...r, me: g.state } : r; }); setHanded(true); }} /></Card>
            ) : null}
            {handed ? <Notice tone="ok" text="Handed to the owner's side on this phone. Switch back to your own view in Settings, Demonstration tools." /> : null}
            <Btn onPress={() => setView({ k: "open", id: it.grantId })} label="Done" />
          </Page>
        );
      }
      const m = VERIFICATION_METHODS.find((x) => x.id === method);
      return (
        <Page title="Your reply" intro="A thumbs-up is not a check. Say how you checked and what you found.">
          <Txt v="heading" header>How did you check?</Txt>
          {VERIFICATION_METHODS.map((x) => <Choice key={x.id} label={x.label} detail={x.independent ? undefined : x.why} selected={method === x.id} onPress={() => setMethod(x.id)} />)}
          <Txt v="heading" header style={{ marginTop: space.s }}>What happened?</Txt>
          {STEP_OUTCOMES.map((o) => <Choice key={o.id} label={o.label} selected={outcome === o.id} onPress={() => setOutcome(o.id)} />)}
          <Field label="What did you find?" value={findings} onChange={setFindings} multiline help="A sentence or two." />
          {confirm && m ? (
            <ConfirmCard title={`Create a reply for ${it.ownerName}?`} yes="Create the reply code" no="Go back" onNo={() => setConfirm(false)}
              body={[`How you checked: ${m.label}.`, `What happened: ${STEP_OUTCOMES.find((o) => o.id === outcome)?.label}.`, `What you wrote: “${findings}”`, m.independent ? "Only they can open the code. It is not sent until you send it." : `This way of checking does not count as a verification: ${m.why}`]}
              onYes={async () => {
                if (busy.current) return;
                busy.current = true;
                try {
                  const r = respond(dev, it.grantId, { method, outcome: outcome as StepOutcome, findings, checkedAt: now() }, now());
                  if (!r.ok) { setMsg({ ok: false, text: r.message }); setConfirm(false); return; }
                  await updateDev(() => r.state);
                  setReply({ code: r.message, version: r.version });
                  nav.clearDraft(`reply.findings.${it.grantId}`);
                } finally { busy.current = false; }
              }} />
          ) : (
            <Btn label="Review my reply" disabled={!method || !outcome || findings.trim().length < 3} onPress={() => setConfirm(true)} />
          )}
          {msg && !msg.ok ? <Notice tone="bad" text={msg.text} /> : null}
        </Page>
      );
    }
    return (
      <Page title={`From ${it.ownerName}`}>
        <InboxChip it={it} now={now()} />
        {it.status === "revoked" ? <Card><Txt>The sender stopped this request. The message was removed from this app. Anything you already saw or copied is not affected.</Txt></Card> : (
          <View>
            <Card tone="info"><Txt style={{ fontWeight: "700" }}>Do not use the phone number or link in the message below to check it.</Txt><Txt>Call the person on a number you already trust, then reply.</Txt></Card>
            <Card><Txt v="heading" header>The message</Txt><Txt selectable>{it.text}</Txt></Card>
            {it.note ? <Card><Txt v="heading" header>Their note</Txt><Txt>{it.note}</Txt></Card> : null}
            {it.labels.length ? <Card><Txt v="heading" header>Warning signs they saw</Txt>{it.labels.map((l) => <Txt key={l}>{`• ${l}`}</Txt>)}</Card> : null}
            <Txt v="small" color={th.textMuted}>{`Open until ${when(it.expiresAt)}.`}</Txt>
          </View>
        )}
        {it.replies.map((r) => <Card key={r.version}><Txt style={{ fontWeight: "700" }}>{`Your reply ${r.version}`}</Txt><Txt>{`${VERIFICATION_METHODS.find((m) => m.id === r.method)?.label}. ${STEP_OUTCOMES.find((o) => o.id === r.outcome)?.label}. “${r.findings}”`}</Txt></Card>)}
        {usable ? <Btn label={it.replies.length ? "Send a newer reply" : "Reply"} onPress={() => setView({ k: "reply", id: it.grantId })} /> : null}
        <Btn kind="secondary" label="Delete this" onPress={async () => { await updateDev((d) => deleteInboxItem(d, it.grantId, now())); setView({ k: "list" }); }} />
      </Page>
    );
  }

  return (
    <Page title="Requests for me" intro="When someone you trust asks you to look at a message, they send you a code. Paste it here.">
      {viewer === "demo" ? <Notice tone="wait" title="Demonstration" text="You are looking at the pretend helper's side on this phone. This is not a real person." /> : null}
      <Field label="Paste a code someone sent you" value={code} onChange={(t) => { setCode(t); setMsg(null); }} multiline placeholder="Starts with SCM1." />
      <Btn kind="secondary" label="Paste from clipboard" icon="copy" onPress={async () => { const t = await pasteText(); if (t) setCode(t); }} />
      <Btn label="Open the code" disabled={code.trim().length < 6} onPress={async () => {
        const r = importMessage(dev, code, now());
        if (!r.ok) { setMsg({ ok: false, text: r.message }); return; }
        await updateDev(() => r.state);
        setCode("");
        const i = r.imported;
        if (i.kind === "share") setMsg({ ok: true, text: "A request was added below." });
        else if (i.kind === "revoke") setMsg({ ok: true, text: "The sender stopped this request. It was closed here." });
        else setMsg({ ok: true, text: i.cls === "verification_step_completed" ? "Reply added to your message. It says a check was made another way. We cannot confirm that ourselves." : "Reply added. It is not a completed check." });
      }} />
      {msg ? <Notice tone={msg.ok ? "ok" : "bad"} text={msg.text} /> : null}
      {dev.inbox.length === 0 ? (
        <EmptyState icon="inbox" title="Nothing waiting" body="Nobody has asked you to look at a message yet. If someone sends you a code, paste it above." />
      ) : dev.inbox.map((it) => (
        <Card key={it.grantId}>
          <Txt v="heading" header>{`From ${it.ownerName}`}</Txt>
          <InboxChip it={it} now={now()} />
          <Btn kind="secondary" label="Open" hint={`Open the request from ${it.ownerName}`} onPress={() => open(it.grantId)} />
        </Card>
      ))}
    </Page>
  );
}
