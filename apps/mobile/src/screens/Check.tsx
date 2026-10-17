import React, { useMemo, useState } from "react";
import { Image, View } from "react-native";
import {
  VERIFICATION_METHODS, STEP_OUTCOMES, NO_RESPONSE_GUIDANCE, addCase, canReceiveCases, caseOutcome, deleteCase, deliveryLabel, findCase, importMessage, markSent,
  prepareShare, rangesForText, recordStep, revokeGrant, sharedContent, suggestRedactions, suggestRoute, MAX_CASE_CHARS,
  type CaseRecord, type Contact, type Indicator, type StepOutcome
} from "@scamcircle/core";
import { Banner, Btn, Card, ConfirmCard, Field, Row, Screen, T } from "../ui";
import { CodeBox, OutcomeChip, when } from "../common";
import { colors } from "../theme";
import { useStore } from "../store";
import { pickScreenshot } from "../photo";
import { pasteText } from "../transport";

type View_ = { v: "paste" } | { v: "result"; id: string } | { v: "record"; id: string } | { v: "share"; id: string };

export function Check({ onHome, initialCase, goPeople }: { onHome: () => void; initialCase?: string; goPeople: () => void }) {
  const [view, setView] = useState<View_>(initialCase ? { v: "result", id: initialCase } : { v: "paste" });
  if (view.v === "paste") return <Paste onHome={onHome} onDone={(id) => setView({ v: "result", id })} />;
  if (view.v === "record") return <Record id={view.id} onHome={onHome} back={() => setView({ v: "result", id: view.id })} />;
  if (view.v === "share") return <Share id={view.id} onHome={onHome} back={() => setView({ v: "result", id: view.id })} goPeople={goPeople} />;
  return <Result id={view.id} onHome={onHome} toRecord={() => setView({ v: "record", id: view.id })} toShare={() => setView({ v: "share", id: view.id })} />;
}

function Paste({ onHome, onDone }: { onHome: () => void; onDone: (id: string) => void }) {
  const { dev, updateDev, now } = useStore();
  const [text, setText] = useState("");
  const [shot, setShot] = useState<string | null>(null);
  const [err, setErr] = useState("");
  return (
    <Screen title="Paste or type the message" step="Step 1 of 3" onHome={onHome}>
      <T style={{ marginBottom: 10 }}>Copy the message you got and paste it here. Or type it.</T>
      <Field label="The message" value={text} onChangeText={setText} multiline placeholder="Paste the message here" />
      <Btn label="Paste from clipboard" onPress={async () => { const t = await pasteText(); if (t) setText(t.slice(0, MAX_CASE_CHARS)); }} />
      <Btn label="Use a screenshot instead" onPress={async () => { try { setErr(""); const u = await pickScreenshot(); if (u) setShot(u); } catch (e) { setErr(e instanceof Error ? e.message : "That picture could not be used."); } }} />
      {shot ? (
        <Card>
          <Image accessibilityLabel="Your screenshot, shown only while you type what it says" source={{ uri: shot }} style={{ width: "100%", height: 260 }} resizeMode="contain" />
          <T v="muted">This app cannot read pictures. Please type what it says in the box above. The picture is not saved or shared.</T>
          <Btn label="Remove the picture" onPress={() => setShot(null)} />
        </Card>
      ) : null}
      {err ? <T role="alert" style={{ color: colors.warnText, marginBottom: 10 }}>{`⚠ ${err}`}</T> : null}
      <Btn kind="primary" label="Next" disabled={text.trim().length === 0} onPress={async () => {
        const r = addCase(dev, { text, source: shot ? "screenshot" : "paste" }, now());
        if (!r.ok) { setErr(r.message); return; }
        await updateDev(() => r.state);
        onDone(r.caseId);
      }} />
    </Screen>
  );
}

function Highlighted({ c }: { c: CaseRecord }) {
  const spans = c.assessment.indicators.filter((i) => i.strength !== "context").flatMap((i) => i.spans).sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let pos = 0;
  spans.forEach((s, i) => {
    if (s.start < pos) return;
    if (s.start > pos) parts.push(c.text.slice(pos, s.start));
    parts.push(<T key={i} style={{ backgroundColor: colors.highlight, fontWeight: "700", textDecorationLine: "underline" }}>{c.text.slice(s.start, s.end)}</T>);
    pos = s.end;
  });
  parts.push(c.text.slice(pos));
  return <T selectable>{parts}</T>;
}

const symbol = (i: Indicator) => (i.strength === "strong" ? "⚠" : i.strength === "moderate" ? "▲" : "•");

function Result({ id, onHome, toRecord, toShare }: { id: string; onHome: () => void; toRecord: () => void; toShare: () => void }) {
  const { dev, now, updateDev } = useStore();
  const [detail, setDetail] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: "delete" } | { kind: "revoke"; grantId: string; name: string }>(null);
  const [notice, setNotice] = useState("");
  const c = findCase(dev, id);
  if (!c) return <Screen title="Not found" onHome={onHome}><T>This message is not on this phone any more.</T></Screen>;
  const a = c.assessment;
  const o = caseOutcome(c, now());
  const route = suggestRoute(a);
  const signs = a.indicators.filter((i) => i.strength !== "context");
  const headline = a.outcome === "cannot_assess"
    ? "We can't tell from the message alone"
    : a.outcome === "indicators_found"
      ? `We found ${signs.length} warning sign${signs.length === 1 ? "" : "s"}`
      : "No warning signs in the words. That is not a check.";
  const tone = a.outcome === "indicators_found" ? "warn" : "amber";
  return (
    <Screen title="What we noticed" step="Step 2 of 3" onHome={onHome}>
      <Card tone={tone}>
        <T v="h2" role="header">{`${a.outcome === "indicators_found" ? "⚠ " : "● "}${headline}`}</T>
        {a.outcome === "cannot_assess" ? <T>{a.headline}</T> : <T>We cannot tell who really sent it from the message alone.</T>}
        <OutcomeChip c={c} now={now()} />
        {o.kind === "verification_step_completed" ? <T>{`${o.label}. ${o.detail}`}</T> : null}
      </Card>

      <Card tone="accent">
        <T v="h2" role="header">Step 3: Check it another way</T>
        <T style={{ fontWeight: "700" }}>{route.headline}</T>
        {route.steps.slice(0, 2).map((s, i) => <T key={i}>{`${i + 1}. ${s}`}</T>)}
      </Card>

      {confirm?.kind === "delete" ? (
        <ConfirmCard danger title="Delete this message?" confirmLabel="Yes, delete it" onCancel={() => setConfirm(null)}
          lines={["The message, your notes and what was shared are removed from this phone.", "Anyone you already shared it with keeps what they already saw. We will make a “stop” code for each person so you can tell their app to close it."]}
          onConfirm={async () => {
            const r = deleteCase(dev, id, now());
            await updateDev(() => r.state);
            onHome();
          }} />
      ) : null}
      {confirm?.kind === "revoke" ? (
        <ConfirmCard danger title={`Stop ${confirm.name} using this?`} confirmLabel="Yes, stop it" onCancel={() => setConfirm(null)}
          lines={[`${confirm.name}'s app will stop showing it once they use the stop code. This cannot take back anything they already saw, copied or screenshotted.`]}
          onConfirm={async () => {
            const r = revokeGrant(dev, id, confirm.grantId, now());
            setConfirm(null);
            if (r.ok) { await updateDev(() => r.state); setNotice(r.notice); }
          }} />
      ) : null}
      {notice ? (
        <Card><T v="h2" role="header">Stop code</T><T>Send this to them so their app closes the request. Until you do, it is still open on their phone.</T><CodeBox label="Stop code" code={notice} /></Card>
      ) : null}

      <Btn kind="primary" label="Ask someone I trust" onPress={toShare} />
      <Btn label="I checked it another way" onPress={toRecord} />
      <Btn label={detail ? "Hide what we noticed" : "See what we noticed"} onPress={() => setDetail(!detail)} selected={detail} />

      {detail ? (
        <View>
          <Card>
            <T v="h2" role="header">The message</T>
            {a.indicators.some((i) => i.strength !== "context") ? <T v="muted">Highlighted words are the warning signs.</T> : null}
            <Highlighted c={c} />
          </Card>
          <Card>
            <T v="h2" role="header">What stood out</T>
            {a.indicators.length === 0 ? <T>Nothing stood out in the words. This does not mean it is real.</T> : null}
            {a.indicators.map((i, n) => (
              <View key={i.id + n} style={{ marginBottom: 6 }}>
                <T style={{ fontWeight: "700" }}>{`${symbol(i)} ${i.label}`}</T>
                <T v="muted">{i.explanation}</T>
              </View>
            ))}
            {a.partialLanguageNote ? <T v="muted">{a.partialLanguageNote}</T> : null}
          </Card>
          <Card>
            <T v="h2" role="header">What we could not check</T>
            {a.missing.map((m, i) => <T key={i}>{`• ${m}`}</T>)}
            {a.supplied.length ? <T v="muted">Contact details inside the message (not proof of anything): {a.supplied.map((s) => s.value).join(", ")}</T> : null}
            <T v="muted">This app only reads English wording and never opens links. It looks for signs; it cannot tell you a message is real.</T>
          </Card>
          {route.steps.length > 2 ? <Card><T v="h2" role="header">More ways to check</T>{route.steps.slice(2).map((s, i) => <T key={i}>{`• ${s}`}</T>)}<T v="muted">{`Do not use: ${route.avoid.join(" ")}`}</T></Card> : null}
          {c.steps.length ? (
            <Card>
              <T v="h2" role="header">Your checks</T>
              {c.steps.map((s) => <T key={s.id}>{`${s.completes ? "✓" : "○"} ${when(s.at)}: ${VERIFICATION_METHODS.find((m) => m.id === s.method)?.label}. ${STEP_OUTCOMES.find((x) => x.id === s.outcome)?.label}.${s.completes ? "" : " (Not a completed check.)"}`}</T>)}
            </Card>
          ) : null}
          {c.grants.length ? (
            <Card>
              <T v="h2" role="header">Shared with</T>
              {c.grants.map((g) => (
                <View key={g.id} style={{ marginBottom: 8 }}>
                  <T style={{ fontWeight: "700" }}>{g.contactName}</T>
                  <T>{deliveryLabel(g, now())}</T>
                  <T v="muted">{`Open until ${when(g.expiresAt)}.`}</T>
                  {g.replies.map((r) => (
                    <View key={r.version} style={{ marginTop: 4 }}>
                      <T>{`Reply ${r.version}: ${r.cls === "verification_step_completed" ? "✓ reports a check made another way" : r.cls === "opinion_only" ? "● opinion only, not a check" : "○ not a completed check"}`}</T>
                      <T v="muted">{`${VERIFICATION_METHODS.find((m) => m.id === r.method)?.label}. ${STEP_OUTCOMES.find((x) => x.id === (r.outcome as StepOutcome))?.label}. “${r.findings}”`}</T>
                    </View>
                  ))}
                  {g.status === "active" && !g.markedSentAt ? <Btn label="I have sent it" onPress={() => updateDev((d) => markSent(d, id, g.id, now()))} /> : null}
                  {g.status === "active" ? <Btn label={`Stop ${g.contactName} using this`} onPress={() => setConfirm({ kind: "revoke", grantId: g.id, name: g.contactName })} /> : null}
                </View>
              ))}
              {o.unresolved && c.grants.every((g) => g.replies.length === 0 || now() > g.expiresAt) ? (
                <View><T style={{ fontWeight: "700" }}>If nobody answers</T>{NO_RESPONSE_GUIDANCE.map((g, i) => <T key={i}>{`• ${g}`}</T>)}</View>
              ) : null}
            </Card>
          ) : null}
          <Btn kind="danger" label="Delete this message" onPress={() => setConfirm({ kind: "delete" })} />
        </View>
      ) : null}
      <Btn kind="link" label="Done" onPress={onHome} />
    </Screen>
  );
}

function Record({ id, onHome, back }: { id: string; onHome: () => void; back: () => void }) {
  const { dev, updateDev, now } = useStore();
  const [method, setMethod] = useState("");
  const [outcome, setOutcome] = useState<StepOutcome | "">("");
  const [routeId, setRouteId] = useState("");
  const [res, setRes] = useState<{ completes: boolean; reason?: string } | null>(null);
  const c = findCase(dev, id);
  const good = VERIFICATION_METHODS.filter((m) => m.independent);
  const bad = VERIFICATION_METHODS.filter((m) => !m.independent);
  if (res) {
    return (
      <Screen title={res.completes ? "Check saved" : "Saved, but not a completed check"} onHome={onHome}>
        <Card tone={res.completes ? "ok" : "amber"}>
          <T>{res.completes ? "✓ You checked this another way and got a clear answer. That does not make a payment safe." : `○ ${res.reason}`}</T>
        </Card>
        <Btn kind="primary" label="Back to the message" onPress={back} />
      </Screen>
    );
  }
  return (
    <Screen title="How did you check?" step="Step 3 of 3" onHome={onHome}>
      <T v="h2" role="header" style={{ marginBottom: 8 }}>Ways that count</T>
      {good.map((m) => <Row key={m.id} label={m.label} selected={method === m.id} onPress={() => setMethod(m.id)} />)}
      <T v="h2" role="header" style={{ marginVertical: 8 }}>Ways that do not count</T>
      <T v="muted" style={{ marginBottom: 8 }}>You can still record these. They will not count as a check.</T>
      {bad.map((m) => <Row key={m.id} label={m.label} detail={m.why} selected={method === m.id} onPress={() => setMethod(m.id)} />)}
      {dev.routes.length && c ? (
        <View>
          <T v="h2" role="header" style={{ marginVertical: 8 }}>Which trusted number or place?</T>
          <Row label="None of these" selected={routeId === ""} onPress={() => setRouteId("")} />
          {dev.routes.map((r) => <Row key={r.id} label={r.label} detail={r.addedAt < c.createdAt ? "Added before this message" : "Added after this message arrived. This will not count."} selected={routeId === r.id} onPress={() => setRouteId(r.id)} />)}
        </View>
      ) : null}
      <T v="h2" role="header" style={{ marginVertical: 8 }}>What happened?</T>
      {STEP_OUTCOMES.map((o) => <Row key={o.id} label={o.label} selected={outcome === o.id} onPress={() => setOutcome(o.id)} />)}
      <Btn kind="primary" label="Save" disabled={!method || !outcome} onPress={async () => {
        const r = recordStep(dev, id, { method, outcome: outcome as StepOutcome, routeId: routeId || undefined }, now());
        if (r.ok) { await updateDev(() => r.state); setRes({ completes: r.completes, reason: r.reason }); }
      }} />
    </Screen>
  );
}

function Share({ id, onHome, back, goPeople }: { id: string; onHome: () => void; back: () => void; goPeople: () => void }) {
  const { dev, now, updateRoot, updateDev, root } = useStore();
  const c = findCase(dev, id)!;
  const [step, setStep] = useState<"who" | "what" | "how" | "confirm" | "done">("who");
  const [who, setWho] = useState("");
  const sugg = useMemo(() => suggestRedactions(c.text), [c.text]);
  const [off, setOff] = useState<Record<number, boolean>>({});
  const [manual, setManual] = useState<string[]>([]);
  const [word, setWord] = useState("");
  const [ttl, setTtl] = useState(24);
  const [note, setNote] = useState("");
  const [labels, setLabels] = useState(true);
  const [out, setOut] = useState<{ msg: string; grantId: string; contact: Contact } | null>(null);
  const [err, setErr] = useState("");
  const [delivered, setDelivered] = useState(false);
  const people = dev.contacts;
  const ok = people.filter(canReceiveCases);
  const ranges = [...sugg.filter((_, i) => !off[i]).map((s) => ({ start: s.start, end: s.end })), ...manual.flatMap((m) => rangesForText(c.text, m))];
  const preview = sharedContent(c, ranges);
  const contact = dev.contacts.find((p) => p.id === who);

  if (step === "who") {
    return (
      <Screen title="Who should see it?" step="Step 1 of 3" onHome={onHome}>
        {ok.length === 0 ? (
          <Card><T>No trusted people yet. Add someone you know and trust, and check their code words together first.</T><Btn kind="primary" label="Go to my trusted people" onPress={goPeople} /></Card>
        ) : (
          <View>{ok.map((p) => <Row key={p.id} label={p.name} detail={p.kind === "demo" ? "Demo helper on this phone (simulated)" : "Code words checked"} selected={who === p.id} onPress={() => setWho(p.id)} />)}</View>
        )}
        {people.length > ok.length ? <T v="muted" style={{ marginBottom: 10 }}>{`Not shown: ${people.filter((p) => !canReceiveCases(p)).map((p) => p.name).join(", ")}. They cannot get messages until you have checked their code words.`}</T> : null}
        <Btn kind="primary" label="Next" disabled={!who} onPress={() => setStep("what")} />
        <Btn kind="link" label="Back" onPress={back} />
      </Screen>
    );
  }
  if (step === "what") {
    return (
      <Screen title="What will they see?" step="Step 2 of 3" onHome={onHome}>
        <Banner text="Messages can hold other people's details. Hide anything private that is not needed." />
        <Card><T v="h2" role="header">They will see exactly this</T><T selectable>{preview}</T></Card>
        {sugg.map((s, i) => <Row key={i} role="checkbox" label={`Hide ${s.label}: ${s.text}`} selected={!off[i]} onPress={() => setOff({ ...off, [i]: !off[i] })} />)}
        {manual.map((m, i) => <Row key={m + i} role="checkbox" label={`Hide “${m}”`} selected onPress={() => setManual(manual.filter((_, j) => j !== i))} />)}
        <Field label="Hide another word or number" hint="Type it exactly as it appears, such as a name." value={word} onChangeText={setWord} />
        <Btn label="Hide it" disabled={word.trim().length < 2 || rangesForText(c.text, word).length === 0} onPress={() => { setManual([...manual, word.trim()]); setWord(""); }} />
        <Btn kind="primary" label="Next" onPress={() => setStep("how")} />
        <Btn kind="link" label="Back" onPress={() => setStep("who")} />
      </Screen>
    );
  }
  if (step === "how") {
    return (
      <Screen title="How long can they use it?" step="Step 3 of 3" onHome={onHome}>
        {[[24, "1 day"], [72, "3 days"], [168, "7 days"]].map(([h, l]) => <Row key={String(h)} label={String(l)} selected={ttl === h} onPress={() => setTtl(h as number)} />)}
        <Field label="A note for them (optional)" value={note} onChangeText={setNote} hint="For example: “Can you ring Alex's sister?”" />
        {c.assessment.indicators.some((i) => i.strength !== "context") ? <Row role="checkbox" label="Also tell them the warning signs we noticed" detail="Only the names of the signs, not your text." selected={labels} onPress={() => setLabels(!labels)} /> : null}
        {err ? <T role="alert" style={{ color: colors.warnText }}>{`⚠ ${err}`}</T> : null}
        <Btn kind="primary" label="Review" onPress={() => { setErr(""); setStep("confirm"); }} />
        <Btn kind="link" label="Back" onPress={() => setStep("what")} />
      </Screen>
    );
  }
  if (step === "confirm" && contact) {
    return (
      <Screen title="Check before you create the code" onHome={onHome}>
        <ConfirmCard title={`Create a private code for ${contact.name}?`} confirmLabel="Create the code" onCancel={() => setStep("how")}
          lines={[`Only ${contact.name} can open it. They will see exactly this: “${preview}”`, note ? `Your note: “${note}”` : "No note.", `It stops working in their app after ${when(now() + ttl * 3600_000)}.`, "Nothing is sent by this app. The code is not delivered until you send it yourself. Anything they see or copy cannot be taken back."]}
          onConfirm={async () => {
            const r = prepareShare(dev, id, contact.id, { ranges, note, includeLabels: labels, ttlMs: ttl * 3600_000 }, now());
            if (!r.ok) { setErr(r.message); setStep("how"); return; }
            await updateDev(() => r.state);
            setOut({ msg: r.message, grantId: r.grantId, contact });
            setStep("done");
          }} />
      </Screen>
    );
  }
  return (
    <Screen title="Your private code" onHome={onHome}>
      <Card tone="amber"><T>{`⏳ Not delivered yet. Copy or share this code with ${out?.contact.name}. Only they can open it.`}</T></Card>
      {out ? <CodeBox label={`Private code for ${out.contact.name}`} code={out.msg} /> : null}
      <Btn label="I have sent it" onPress={async () => { await updateDev((d) => markSent(d, id, out!.grantId, now())); }} />
      {out?.contact.kind === "demo" && root.demo && !delivered ? (
        <Btn label="Hand it to the demo helper now" hint="Demo only" onPress={async () => {
          await updateRoot((r) => { const g = importMessage(r.demo!, out!.msg, now()); return g.ok ? { ...r, demo: g.state } : r; });
          setDelivered(true);
        }} />
      ) : null}
      {delivered ? <T role="alert">✓ The demo helper now has it. Open “Messages waiting for me” in Demo options &gt; look as the helper.</T> : null}
      <Btn kind="primary" label="Done" onPress={back} />
    </Screen>
  );
}
