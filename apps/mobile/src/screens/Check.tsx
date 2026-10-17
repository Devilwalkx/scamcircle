import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import {
  VERIFICATION_METHODS, STEP_OUTCOMES, NO_RESPONSE_GUIDANCE, MAX_CASE_CHARS, addCase, canReceiveCases, caseOutcome, composeAskText, deleteCase, deliveryLabel, describeResult, findCase,
  importMessage, markSent, prepareShare, rangesForText, recordStep, revokeGrant, sharedContent, suggestRedactions,
  type CaseRecord, type Contact, type Notice as StopNotice, type StepOutcome
} from "@scamcircle/core";
import { Btn, Bullets, Card, Chip, Collapsible, ConfirmCard, DemoStrip, EmptyState, Field, Choice, Notice, Txt, type Tone } from "../ui";
import { Page } from "../page";
import { CodeBox, OutcomeChip, when } from "../parts";
import { useNav, useView, useDraft } from "../nav";
import { useStore } from "../store";
import { useTheme } from "../design/theme";
import { radius, space } from "../design/tokens";
import { MAX_TRIM, TRIM_STEP, cropPicture, pickPicture, preparePicture, sharePicture, type Picture, type Trim } from "../photo";
import { pasteText } from "../transport";

export function Check() {
  const nav = useNav();
  const initial = useRef(nav.takeParam()).current;
  const [caseId, setCaseIdState] = useState<string | undefined>(initial ?? undefined);
  const setCaseId = (id: string) => { setCaseIdState(id); nav.scrollTop(); };
  if (!caseId) return <Paste onDone={setCaseId} />;
  return <CaseFlow id={caseId} />;
}

// ---------------------------------------------------------------- 1. put the message in

type PasteView = { k: "paste" } | { k: "crop" };

function Paste({ onDone }: { onDone: (id: string) => void }) {
  const nav = useNav();
  const c = useTheme();
  const { dev, updateDev, now } = useStore();
  const [text, setText] = useDraft("check.text");
  const [picture, setPicture] = useState<Picture | null>(null);
  const [view, setView] = useView<PasteView>({ k: "paste" });
  const [err, setErr] = useState("");
  const busy = useRef(false);
  const inc = nav.incoming;

  // A picture shared from another app is prepared here (re-encoded, hidden details removed). It is never read or stored.
  const incUri = inc?.imageUri;
  useEffect(() => {
    if (!incUri) return;
    let live = true;
    preparePicture(incUri).then((p) => { if (live) setPicture(p); }).catch((e) => { if (live) setErr(e instanceof Error ? e.message : "That picture could not be used."); });
    return () => { live = false; };
  }, [incUri]);

  if (view.k === "crop" && picture) return <Crop picture={picture} onBack={() => setView({ k: "paste" })} />;

  const submit = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = addCase(dev, { text, source: picture ? "screenshot" : "paste" }, now());
      if (!r.ok) { setErr(r.message); return; }
      await updateDev(() => r.state);
      nav.clearDraft("check.text");
      nav.receive(null);
      onDone(r.caseId);
    } finally { busy.current = false; }
  };

  return (
    <Page title="Check a message">
      {inc?.text ? <Notice tone="info" title="Received from another app" text={inc.simulated ? "Test stand-in: text arrived as if shared from another app. Read it, change it if you like, then check it." : "Text was shared to ScamCircle from another app and put in the box. Read it, change it if you like, then check it."} /> : null}
      {inc?.imageUri && !inc.text ? <Notice tone="info" title="Picture received" text="A picture was shared to ScamCircle. ScamCircle cannot read pictures, so type what it says into the box." /> : null}
      <Field label="The message" value={text} onChange={(t) => { setText(t); setErr(""); }} multiline placeholder="Paste the message here, or type it" error={err || null} />
      <Btn label="Check this message" icon="search" disabled={text.trim().length === 0} onPress={submit} id="check-submit" />
      <Btn kind="secondary" label="Paste from clipboard" icon="copy" onPress={async () => { const t = await pasteText(); if (t) { setText(t.slice(0, MAX_CASE_CHARS)); setErr(""); } }} />
      {!picture ? (
        <Btn kind="quiet" label="It is in a picture" icon="image" hint="Choose a picture. ScamCircle cannot read it" onPress={async () => { try { setErr(""); const p = await pickPicture(); if (p) setPicture(p); } catch (e) { setErr(e instanceof Error ? e.message : "That picture could not be used."); } }} />
      ) : (
        <Card>
          <Txt v="heading" header>Your picture</Txt>
          <Image accessibilityLabel="The picture you chose. It was not analysed." source={{ uri: picture.uri }} style={{ width: "100%", aspectRatio: picture.width / picture.height, maxHeight: 280, borderRadius: radius.m, backgroundColor: c.surfaceAlt }} resizeMode="contain" />
          <Notice tone="wait" title="This picture was not analysed" text="ScamCircle cannot read pictures. To check the words in it, type them into the box above. The picture is not saved." />
          <Btn kind="secondary" label="Crop it to share with someone" icon="crop" onPress={() => setView({ k: "crop" })} />
          <Btn kind="quiet" label="Remove the picture" onPress={() => { setPicture(null); nav.receive(null); }} />
        </Card>
      )}
      {text.length > 0 || picture ? <Btn kind="quiet" label="Clear everything here" onPress={() => { nav.clearDraft("check.text"); nav.receive(null); setPicture(null); setErr(""); }} /> : null}
    </Page>
  );
}

function Crop({ picture, onBack }: { picture: Picture; onBack: () => void }) {
  const c = useTheme();
  const [trim, setTrim] = useState<Trim>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const step = (edge: keyof Trim, d: number) => setTrim((t) => {
    const next = Math.round((t[edge] + d) * 100) / 100;
    const other = edge === "top" ? t.bottom : edge === "bottom" ? t.top : edge === "left" ? t.right : t.left;
    if (next < 0 || next > MAX_TRIM || next + other > 0.8) return t;
    return { ...t, [edge]: next };
  });
  const edges: Array<[keyof Trim, string]> = [["top", "top"], ["bottom", "bottom"], ["left", "left side"], ["right", "right side"]];
  const dim = { position: "absolute" as const, backgroundColor: c.scrim };
  return (
    <Page title="Crop a picture to share" intro="Trim edges off to hide anything you do not want to send. This is only for sending to someone you trust.">
      <Notice tone="wait" title="This picture was not analysed" text="ScamCircle cannot read pictures and has not checked this one. When you share it, it goes through the app you choose, and ScamCircle does not encrypt it." />
      <View style={{ width: "100%", aspectRatio: picture.width / picture.height, maxHeight: 320, alignSelf: "center", marginBottom: space.m, borderRadius: radius.m, overflow: "hidden" }}>
        <Image accessibilityLabel="Preview of the picture. Dark bands show what will be cut off." source={{ uri: picture.uri }} style={{ width: "100%", height: "100%" }} resizeMode="stretch" />
        <View pointerEvents="none" style={[dim, { top: 0, left: 0, right: 0, height: `${trim.top * 100}%` }]} />
        <View pointerEvents="none" style={[dim, { bottom: 0, left: 0, right: 0, height: `${trim.bottom * 100}%` }]} />
        <View pointerEvents="none" style={[dim, { top: `${trim.top * 100}%`, bottom: `${trim.bottom * 100}%`, left: 0, width: `${trim.left * 100}%` }]} />
        <View pointerEvents="none" style={[dim, { top: `${trim.top * 100}%`, bottom: `${trim.bottom * 100}%`, right: 0, width: `${trim.right * 100}%` }]} />
      </View>
      {edges.map(([edge, name]) => (
        <View key={edge} style={{ marginBottom: space.xs }}>
          <Txt v="label" live>{`Cut off the ${name}: ${Math.round(trim[edge] * 100)}%`}</Txt>
          <View style={{ flexDirection: "row", gap: space.xs }}>
            <View style={{ flex: 1 }}><Btn kind="secondary" label={`Less from the ${name}`} onPress={() => step(edge, -TRIM_STEP)} /></View>
            <View style={{ flex: 1 }}><Btn kind="secondary" label={`More from the ${name}`} onPress={() => step(edge, TRIM_STEP)} /></View>
          </View>
        </View>
      ))}
      <Btn label="Share the cropped picture…" icon="share" disabled={busy} onPress={async () => {
        setBusy(true); setMsg("");
        try { const p = await cropPicture(picture, trim); const r = await sharePicture(p); setMsg(r.message); } catch (e) { setMsg(e instanceof Error ? e.message : "The picture could not be cropped."); } finally { setBusy(false); }
      }} />
      {msg ? <Notice tone="info" text={msg} /> : null}
      <Btn kind="quiet" label="Back to the message" onPress={onBack} />
    </Page>
  );
}

// ---------------------------------------------------------------- 2. what we found, and what to do next

type ShareStep = "how" | "who" | "what" | "opts" | "confirm" | "done";
type CaseView = { k: "result" } | { k: "record" } | { k: "share"; step: ShareStep } | { k: "deleted"; notices: StopNotice[] };
type Method = "text" | "code";
interface ShareState { method: Method; who: string; off: Record<number, boolean>; manual: string[]; ttl: number; labels: boolean }

function CaseFlow({ id }: { id: string }) {
  const nav = useNav();
  const [view, setView] = useState<CaseView>({ k: "result" });
  const [share, setShare] = useState<ShareState>({ method: "text", who: "", off: {}, manual: [], ttl: 24, labels: true });
  const [note, setNote] = useDraft(`share.note.${id}`);
  const [out, setOut] = useState<{ message: string; grantId?: string; contact?: Contact; text?: string } | null>(null);
  const viewRef = useRef(view); viewRef.current = view;
  const stepKey = view.k === "share" ? `share-${view.step}` : view.k;
  useEffect(() => { nav.scrollTop(); }, [stepKey]);  // eslint-disable-line react-hooks/exhaustive-deps
  const shareRef = useRef(share); shareRef.current = share;

  // System Back: unwind one step inside this flow, then leave to the first screen.
  const back = () => {
    const v = viewRef.current;
    if (v.k === "result" || v.k === "deleted") return false;
    if (v.k === "record") { setView({ k: "result" }); return true; }
    const m = shareRef.current.method;
    const prev: Record<ShareStep, CaseView> = {
      how: { k: "result" }, who: { k: "share", step: "how" }, what: { k: "share", step: m === "code" ? "who" : "how" },
      opts: { k: "share", step: "what" }, confirm: { k: "share", step: "opts" }, done: { k: "result" }
    };
    setView(prev[v.step]);
    return true;
  };
  useEffect(() => { nav.registerBack(back); return () => nav.registerBack(null); });

  if (view.k === "record") return <Record id={id} done={() => setView({ k: "result" })} />;
  if (view.k === "deleted") return <Deleted notices={view.notices} />;
  if (view.k === "share") return <Share id={id} step={view.step} setStep={(s) => setView({ k: "share", step: s })} st={share} setSt={setShare} note={note} setNote={setNote} out={out} setOut={setOut} close={() => setView({ k: "result" })} />;
  return <Result id={id} toRecord={() => setView({ k: "record" })} toShare={() => { setOut(null); setView({ k: "share", step: "how" }); }} deleted={(n) => setView({ k: "deleted", notices: n })} />;
}

function Marked({ c }: { c: CaseRecord }) {
  const th = useTheme();
  const spans = c.assessment.indicators.filter((i) => i.strength !== "context").flatMap((i) => i.spans).sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let pos = 0;
  spans.forEach((s, i) => {
    if (s.start < pos) return;
    if (s.start > pos) parts.push(c.text.slice(pos, s.start));
    parts.push(<Text key={i} style={{ backgroundColor: th.markBg, color: th.markText, fontWeight: "700", textDecorationLine: "underline" }}>{c.text.slice(s.start, s.end)}</Text>);
    pos = s.end;
  });
  parts.push(c.text.slice(pos));
  return <Txt selectable>{parts}</Txt>;
}

const mark = (s: string) => (s === "strong" ? "Strong sign" : s === "moderate" ? "Sign" : "Note");

function Result({ id, toRecord, toShare, deleted }: { id: string; toRecord: () => void; toShare: () => void; deleted: (n: StopNotice[]) => void }) {
  const { dev, now, updateDev } = useStore();
  const nav = useNav();
  const th = useTheme();
  const [confirm, setConfirm] = useState<null | { kind: "delete" } | { kind: "revoke"; grantId: string; name: string }>(null);
  const [notice, setNotice] = useState("");
  const k = findCase(dev, id);
  if (!k) return <Page title="Not found"><EmptyState icon="info" title="This message is not on this phone any more" body="It may have been deleted." action={<Btn label="Back to start" onPress={() => nav.go("home")} />} /></Page>;
  const v = describeResult(k, now());
  const o = caseOutcome(k, now());
  const tone: Tone = v.inconclusive ? "wait" : v.found.items.length ? "bad" : "wait";
  return (
    <Page title="What we found">
      {k.source === "demo" ? <DemoStrip text="This is a made-up example message, not a real one. Delete it when you have seen enough." /> : null}
      <Card tone={tone}>
        <Txt v="heading" header>{v.summary}</Txt>
        <OutcomeChip c={k} now={now()} />
        {o.kind === "verification_step_completed" ? <Txt>{`${o.label}. ${o.detail}`}</Txt> : null}
      </Card>

      <Card>
        <Txt v="heading" header>{v.found.heading}</Txt>
        {v.found.items.length === 0 ? <Txt color={th.textMuted}>{v.found.emptyNote}</Txt> : v.found.items.map((i, n) => (
          <View key={i.label + n} style={{ marginBottom: 6 }}>
            <Chip tone="bad" text={`${mark(i.strength)}: ${i.label}`} />
            <Txt v="small" color={th.textMuted}>{i.explanation}</Txt>
          </View>
        ))}
        {k.assessment.partialLanguageNote ? <Txt v="small" color={th.textMuted}>{k.assessment.partialLanguageNote}</Txt> : null}
        <Collapsible title="Show the message with the warning words marked"><Marked c={k} /></Collapsible>
      </Card>

      <Card>
        <Txt v="heading" header>{v.notChecked.heading}</Txt>
        <Bullets items={v.notChecked.items} />
        {k.assessment.supplied.length ? <Txt v="small" color={th.textMuted}>{`Contact details inside the message are the sender's choice and prove nothing: ${k.assessment.supplied.map((s) => s.value).join(", ")}`}</Txt> : null}
      </Card>

      <Card>
        <Txt v="heading" header>{v.identity.heading}</Txt>
        <Chip tone={v.identity.status === "not_verified" ? "wait" : "info"} text={v.identity.statusText} />
        <Txt>{v.identity.detail}</Txt>
      </Card>

      <Card tone="info">
        <Txt v="heading" header>{v.next.heading}</Txt>
        <Txt style={{ fontWeight: "700" }}>{v.next.headline}</Txt>
        <Bullets items={v.next.steps} />
        <Txt>{v.next.lookUp}</Txt>
        <Collapsible title="Do not use these to check"><Bullets items={v.next.avoid} /></Collapsible>
        <Btn label="I checked it another way" onPress={toRecord} />
        <Btn kind="secondary" label="Ask someone I trust to look" icon="people" onPress={toShare} />
      </Card>

      {confirm?.kind === "delete" ? (
        <ConfirmCard danger title="Delete this message?" yes="Yes, delete it" no="No, keep it" onNo={() => setConfirm(null)}
          body={["The message, your notes and what you shared are removed from this phone.", "Anyone you already shared it with keeps what they already saw. If you used a private code, we will make a stop code for each person."]}
          onYes={async () => { const r = deleteCase(dev, id, now()); setConfirm(null); await updateDev(() => r.state); if (r.notices.length) deleted(r.notices); else nav.go("home"); }} />
      ) : null}
      {confirm?.kind === "revoke" ? (
        <ConfirmCard danger title={`Stop ${confirm.name} using this?`} yes="Yes, stop it" no="No" onNo={() => setConfirm(null)}
          body={`${confirm.name}'s app will stop showing it once they use the stop code. This cannot take back anything they already saw, copied or screenshotted.`}
          onYes={async () => { const r = revokeGrant(dev, id, confirm.grantId, now()); setConfirm(null); if (r.ok) { await updateDev(() => r.state); setNotice(r.notice); } }} />
      ) : null}
      {notice ? <Card><Txt v="heading" header>Stop code</Txt><Txt>Send this to them so their app closes the request. Until you do, it is still open on their phone.</Txt><CodeBox label="Stop code" code={notice} /></Card> : null}

      <Collapsible title="Your checks and who you asked">
        {k.steps.length === 0 && k.grants.length === 0 ? <Txt color={th.textMuted}>Nothing yet.</Txt> : null}
        {k.steps.map((s) => <Txt key={s.id} v="small">{`${s.completes ? "Counted" : "Not counted"} · ${when(s.at)}: ${VERIFICATION_METHODS.find((m) => m.id === s.method)?.label}. ${STEP_OUTCOMES.find((x) => x.id === s.outcome)?.label}.`}</Txt>)}
        {k.grants.map((g) => (
          <View key={g.id} style={{ marginTop: space.xs, gap: 4 }}>
            <Txt style={{ fontWeight: "700" }}>{g.contactName}</Txt>
            <Txt v="small">{deliveryLabel(g, now())}</Txt>
            <Txt v="small" color={th.textMuted}>{`Open until ${when(g.expiresAt)}. They were shown: “${g.sharedText}”`}</Txt>
            {g.replies.map((r) => (
              <Txt key={r.version} v="small">{`Reply ${r.version} (${r.cls === "verification_step_completed" ? "says they checked another way" : r.cls === "opinion_only" ? "opinion only, not a check" : "not a completed check"}): ${VERIFICATION_METHODS.find((m) => m.id === r.method)?.label}. ${STEP_OUTCOMES.find((x) => x.id === (r.outcome as StepOutcome))?.label}. “${r.findings}”`}</Txt>
            ))}
            {g.status === "active" && !g.markedSentAt ? <Btn kind="secondary" label="I have sent it" onPress={() => updateDev((d) => markSent(d, id, g.id, now()))} /> : null}
            {g.status === "active" ? <Btn kind="secondary" label={`Stop ${g.contactName} using this`} onPress={() => setConfirm({ kind: "revoke", grantId: g.id, name: g.contactName })} /> : null}
          </View>
        ))}
        {o.unresolved && k.grants.length > 0 && k.grants.every((g) => g.replies.length === 0 || now() > g.expiresAt) ? <><Txt style={{ fontWeight: "700" }}>If nobody answers</Txt><Bullets items={[...NO_RESPONSE_GUIDANCE]} /></> : null}
      </Collapsible>
      <Btn kind="danger" label="Delete this message" onPress={() => setConfirm({ kind: "delete" })} />
    </Page>
  );
}

function Deleted({ notices }: { notices: StopNotice[] }) {
  const nav = useNav();
  return (
    <Page title="Deleted" intro="The message is gone from this phone. People you shared it with can still see what they were shown.">
      <Notice tone="wait" text="To close each request on their phone, send them their stop code. Until you do, it stays open there. ScamCircle cannot send it for you." />
      {notices.map((n, i) => <Card key={i}><Txt v="heading" header>{`Stop code for ${n.contactName}`}</Txt><CodeBox label={`Stop code for ${n.contactName}`} code={n.text} /></Card>)}
      <Btn label="Done" onPress={() => nav.go("home")} />
    </Page>
  );
}

// ---------------------------------------------------------------- record a check

function Record({ id, done }: { id: string; done: () => void }) {
  const { dev, updateDev, now } = useStore();
  const [method, setMethod] = useState("");
  const [outcome, setOutcome] = useState<StepOutcome | "">("");
  const [routeId, setRouteId] = useState("");
  const [res, setRes] = useState<{ completes: boolean; reason?: string } | null>(null);
  const busy = useRef(false);
  const k = findCase(dev, id);
  const good = VERIFICATION_METHODS.filter((m) => m.independent);
  const bad = VERIFICATION_METHODS.filter((m) => !m.independent);
  if (res) {
    return (
      <Page title={res.completes ? "Check saved" : "Saved, but it does not count as a check"}>
        <Card tone={res.completes ? "info" : "wait"}>
          <Txt>{res.completes ? "You checked this another way and got a clear answer. This does not make any payment safe: only you can decide what to do." : res.reason ?? ""}</Txt>
        </Card>
        <Btn label="Back to the result" onPress={done} />
      </Page>
    );
  }
  return (
    <Page title="How did you check?" intro="Choose what you did. Only ways that do not rely on the message can count.">
      <Txt v="heading" header>Ways that count</Txt>
      {good.map((m) => <Choice key={m.id} label={m.label} selected={method === m.id} onPress={() => setMethod(m.id)} />)}
      <Txt v="heading" header style={{ marginTop: space.s }}>Ways that do not count</Txt>
      <Txt v="small">You can still record these. They will not count as a check.</Txt>
      {bad.map((m) => <Choice key={m.id} label={m.label} detail={m.why} selected={method === m.id} onPress={() => setMethod(m.id)} />)}
      {dev.routes.length && k ? (
        <>
          <Txt v="heading" header style={{ marginTop: space.s }}>Which trusted number or place?</Txt>
          <Choice label="None of these" selected={routeId === ""} onPress={() => setRouteId("")} />
          {dev.routes.map((r) => <Choice key={r.id} label={r.label} detail={r.addedAt < k.createdAt ? "Added before this message" : "Added after this message arrived. This will not count."} selected={routeId === r.id} onPress={() => setRouteId(r.id)} />)}
        </>
      ) : null}
      <Txt v="heading" header style={{ marginTop: space.s }}>What happened?</Txt>
      {STEP_OUTCOMES.map((o) => <Choice key={o.id} label={o.label} selected={outcome === o.id} onPress={() => setOutcome(o.id)} />)}
      <Btn label="Save" disabled={!method || !outcome} onPress={async () => {
        if (busy.current) return;
        busy.current = true;
        try {
          const r = recordStep(dev, id, { method, outcome: outcome as StepOutcome, routeId: routeId || undefined }, now());
          if (r.ok) { await updateDev(() => r.state); setRes({ completes: r.completes, reason: r.reason }); }
        } finally { busy.current = false; }
      }} />
    </Page>
  );
}

// ---------------------------------------------------------------- ask someone

interface ShareProps {
  id: string; step: ShareStep; setStep: (s: ShareStep) => void; st: ShareState; setSt: (s: ShareState) => void;
  note: string; setNote: (s: string) => void;
  out: { message: string; grantId?: string; contact?: Contact; text?: string } | null; setOut: (o: ShareProps["out"]) => void; close: () => void;
}

const INCOMPLETE = "ScamCircle cannot tell whether this arrived or whether they answered. There is no delivery receipt and no reply notification. Ask them yourself.";

function Share({ id, step, setStep, st, setSt, note, setNote, out, setOut, close }: ShareProps) {
  const nav = useNav();
  const th = useTheme();
  const { dev, now, updateRoot, updateDev, root } = useStore();
  const k = findCase(dev, id)!;
  const sugg = useMemo(() => suggestRedactions(k.text), [k.text]);
  const [word, setWord] = useState("");
  const [err, setErr] = useState("");
  const [delivered, setDelivered] = useState(false);
  const busy = useRef(false);
  const people = dev.contacts;
  const ok = people.filter(canReceiveCases);
  const ranges = [...sugg.filter((_, i) => !st.off[i]).map((s) => ({ start: s.start, end: s.end })), ...st.manual.flatMap((m) => rangesForText(k.text, m))];
  const preview = sharedContent(k, ranges);
  const contact = dev.contacts.find((p) => p.id === st.who);
  const signs = k.assessment.indicators.filter((i) => i.strength !== "context").map((i) => i.label);
  const askText = composeAskText({ shared: preview, note, signs: st.labels ? signs : [] });

  if (step === "how") {
    return (
      <Page title="Ask someone you trust" intro="It is your choice who sees this and what they see. Nothing is sent unless you send it.">
        <Choice label="Send the text through my own messaging app" detail="Simplest. You choose the app and the person. It goes as plain text: ScamCircle does not encrypt it." selected={st.method === "text"} onPress={() => setSt({ ...st, method: "text" })} />
        <Choice label="Make a private code for a trusted person" detail="Only that person can open it. They need ScamCircle too, and you must both have checked each other's code words first." selected={st.method === "code"} onPress={() => setSt({ ...st, method: "code" })} />
        <Btn label="Next" onPress={() => setStep(st.method === "code" ? "who" : "what")} />
        <Btn kind="quiet" label="Back to the result" onPress={close} />
      </Page>
    );
  }
  if (step === "who") {
    return (
      <Page title="Who should see it?">
        {ok.length === 0 ? (
          <EmptyState icon="people" title="No checked people yet" body="Add someone you know and trust, and compare code words together first." action={<Btn label="Go to trusted people" onPress={() => nav.go("people")} />} />
        ) : ok.map((p) => <Choice key={p.id} label={p.name} detail={p.kind === "demo" ? "Demonstration helper on this phone. Not a real person." : "Code words checked"} selected={st.who === p.id} onPress={() => setSt({ ...st, who: p.id })} />)}
        {people.length > ok.length ? <Txt v="small" color={th.textMuted}>{`Not shown: ${people.filter((p) => !canReceiveCases(p)).map((p) => p.name).join(", ")}. They cannot get messages until you have checked their code words.`}</Txt> : null}
        <Btn label="Next" disabled={!st.who} onPress={() => setStep("what")} />
      </Page>
    );
  }
  if (step === "what") {
    return (
      <Page title="What will they see?" intro="Messages can hold other people's details. Hide anything private that they do not need.">
        <Card><Txt v="heading" header>They will see exactly this</Txt><Txt selectable testID="share-preview">{preview}</Txt></Card>
        {sugg.map((s, i) => <Choice key={i} role="checkbox" label={`Hide ${s.label}: ${s.text}`} selected={!st.off[i]} onPress={() => setSt({ ...st, off: { ...st.off, [i]: !st.off[i] } })} />)}
        {st.manual.map((m, i) => <Choice key={m + i} role="checkbox" label={`Hide “${m}”`} selected onPress={() => setSt({ ...st, manual: st.manual.filter((_, j) => j !== i) })} />)}
        <Field label="Hide another word or number" help="Type it exactly as it appears, such as a name." value={word} onChange={setWord} />
        <Btn kind="secondary" label="Hide it" disabled={word.trim().length < 2 || rangesForText(k.text, word).length === 0} onPress={() => { setSt({ ...st, manual: [...st.manual, word.trim()] }); setWord(""); }} />
        <Btn label="Next" onPress={() => setStep("opts")} />
      </Page>
    );
  }
  if (step === "opts") {
    return (
      <Page title="What else do you want to include?">
        <Field label="A note for them (optional)" value={note} onChange={setNote} help="For example: “Can you ring Alex's sister?”" />
        {signs.length ? <Choice role="checkbox" label="Also tell them the warning signs we found" detail="Only the names of the signs, not your text." selected={st.labels} onPress={() => setSt({ ...st, labels: !st.labels })} /> : null}
        {st.method === "code" ? (
          <>
            <Txt v="heading" header style={{ marginTop: space.s }}>How long can they use it?</Txt>
            {[[24, "1 day"], [72, "3 days"], [168, "7 days"]].map(([h, l]) => <Choice key={String(h)} label={String(l)} selected={st.ttl === h} onPress={() => setSt({ ...st, ttl: h as number })} />)}
          </>
        ) : null}
        {err ? <Notice tone="bad" text={err} /> : null}
        <Btn label="Review" onPress={() => { setErr(""); setStep("confirm"); }} />
      </Page>
    );
  }
  if (step === "confirm") {
    if (st.method === "text") {
      return (
        <Page title="Check before you share">
          <Card><Txt v="heading" header>This is what will be shared</Txt><Txt selectable>{askText}</Txt></Card>
          <Notice tone="wait" title="Not encrypted by ScamCircle" text="You pick the app and the person in the next step. Anything they see or copy cannot be taken back." />
          <Btn label="Continue" onPress={() => { setOut({ message: askText, text: askText }); setStep("done"); }} />
        </Page>
      );
    }
    if (!contact) { return <Page title="Choose a person first"><Btn label="Back" onPress={() => setStep("who")} /></Page>; }
    return (
      <Page title="Check before you create the code">
        <ConfirmCard title={`Create a private code for ${contact.name}?`} yes="Create the code" no="Go back" onNo={() => setStep("opts")}
          body={[`Only ${contact.name} can open it. They will see exactly this: “${preview}”`, note ? `Your note: “${note}”` : "No note.", `It stops working in their app after ${when(now() + st.ttl * 3600_000)}.`, "Nothing is sent by this app. The code is not delivered until you send it yourself. Anything they see or copy cannot be taken back."]}
          onYes={async () => {
            if (busy.current) return;
            busy.current = true;
            try {
              const r = prepareShare(dev, id, contact.id, { ranges, note, includeLabels: st.labels, ttlMs: st.ttl * 3600_000 }, now());
              if (!r.ok) { setErr(r.message); setStep("opts"); return; }
              await updateDev(() => r.state);
              setOut({ message: r.message, grantId: r.grantId, contact });
              nav.clearDraft(`share.note.${id}`);
              setStep("done");
            } finally { busy.current = false; }
          }} />
      </Page>
    );
  }
  // done
  if (out?.text) {
    return (
      <Page title="Your message to share">
        <Card tone="wait"><Txt v="heading" header>Not sent yet</Txt><Txt>{`ScamCircle cannot send it. Use “Share…” and pick the app and the person yourself. ${INCOMPLETE}`}</Txt></Card>
        <CodeBox label="Message to share" code={out.text} sayCopied="Copied. Paste it into a message to them yourself." />
        <Btn kind="secondary" label="Done" onPress={() => { nav.clearDraft(`share.note.${id}`); close(); }} />
      </Page>
    );
  }
  return (
    <Page title="Your private code">
      <Card tone="wait"><Txt v="heading" header>Not delivered yet</Txt><Txt>{`Send this code to ${out?.contact?.name ?? "them"} yourself. Only they can open it. ${INCOMPLETE}`}</Txt></Card>
      {out ? <CodeBox label={`Private code for ${out.contact?.name ?? "them"}`} code={out.message} copyLabel="Copy code" shareLabel="Share code…" /> : null}
      <Btn kind="secondary" label="I have sent it" onPress={async () => { if (out?.grantId) await updateDev((d) => markSent(d, id, out.grantId!, now())); }} />
      {out?.contact?.kind === "demo" && root.demo && !delivered ? (
        <Card tone="wait">
          <Txt v="label">Demonstration only</Txt>
          <Txt v="small">This person is a pretend helper on this same phone. Handing it over here is a simulation, not real delivery.</Txt>
          <Btn kind="secondary" label="Hand it to the demo helper now" onPress={async () => {
            await updateRoot((r) => { const g = importMessage(r.demo!, out!.message, now()); return g.ok ? { ...r, demo: g.state } : r; });
            setDelivered(true);
          }} />
        </Card>
      ) : null}
      {delivered ? <Notice tone="ok" text="The demo helper on this phone now has it. This was a simulation. See Settings, Demonstration tools." /> : null}
      <Btn label="Done" onPress={close} />
    </Page>
  );
}
