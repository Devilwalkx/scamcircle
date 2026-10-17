import React, { useRef, useState } from "react";
import { View } from "react-native";
import {
  addRoute, fingerprintText, fingerprintWords, importContactCode, myContactCode, parseContactCode, rejectKeyChange, removeContact, removeRoute, renameMe, verifyContact, type Contact
} from "@scamcircle/core";
import { Btn, Card, Chip, ConfirmCard, EmptyState, Field, Notice, Txt } from "../ui";
import { Page } from "../page";
import { CodeBox, when } from "../parts";
import { useStore } from "../store";
import { useView } from "../nav";
import { useTheme } from "../design/theme";
import { radius, space } from "../design/tokens";

type V = { k: "list" } | { k: "add1" } | { k: "add2" } | { k: "verify"; id: string } | { k: "remove"; id: string };

function Words({ pk }: { pk: string }) {
  const c = useTheme();
  return (
    <View accessible accessibilityLabel={`Code words: ${fingerprintText(pk)}`} style={{ backgroundColor: c.primaryContainer, borderRadius: radius.m, padding: space.m, flexDirection: "row", flexWrap: "wrap", columnGap: space.s, rowGap: 4 }}>
      {fingerprintWords(pk).map((w, i) => <Txt key={i} v="heading" color={c.onPrimaryContainer}>{w}</Txt>)}
    </View>
  );
}

function ContactChip({ c }: { c: Contact }) {
  if (c.keyChange) return <Chip tone="bad" text="Code changed. Check again" />;
  if (c.kind === "demo") return <Chip tone="wait" text="Demonstration helper. Not a real person" />;
  if (c.status === "verified") return <Chip tone="ok" text="Code words checked" />;
  return <Chip tone="wait" text="Code words not checked yet" />;
}

export function People() {
  const { dev, updateDev, now } = useStore();
  const th = useTheme();
  const [view, setView] = useView<V>({ k: "list" });
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState("");
  const [myName, setMyName] = useState(dev.identity.name);
  const [routeLabel, setRouteLabel] = useState("");
  const busy = useRef(false);

  if (view.k === "add1") {
    return (
      <Page title="Give them your code" intro="Step 1 of 2. Send your code to the person you trust. It holds your name and a public key. It holds none of your messages.">
        <Field label="Your name, as they will see it" value={myName} onChange={setMyName} />
        <Btn kind="secondary" label="Save my name" onPress={() => updateDev((d) => renameMe(d, myName))} />
        <CodeBox label="Your contact code" code={myContactCode(dev)} copyLabel="Copy my code" shareLabel="Share my code…" />
        <Btn label="Next: paste their code" onPress={() => setView({ k: "add2" })} />
      </Page>
    );
  }
  if (view.k === "add2") {
    const parsed = paste.trim() ? parseContactCode(paste) : null;
    return (
      <Page title="Paste their code" intro="Step 2 of 2.">
        <Field label="Their contact code" value={paste} onChange={(t) => { setPaste(t); setErr(""); }} multiline placeholder="Starts with SCC1." error={parsed && !parsed.ok ? parsed.message : err || null} />
        {parsed && parsed.ok ? <Notice tone="info" text={`Found: ${parsed.name}`} /> : null}
        <Btn label="Add this person" disabled={!parsed || !parsed.ok} onPress={async () => {
          if (busy.current) return;
          busy.current = true;
          try {
            const r = importContactCode(dev, paste, now());
            if (!r.ok) { setErr(r.message); return; }
            await updateDev(() => r.state);
            setPaste("");
            setView({ k: "verify", id: r.contactId });
          } finally { busy.current = false; }
        }} />
      </Page>
    );
  }
  if (view.k === "verify") {
    const c = dev.contacts.find((x) => x.id === view.id);
    if (!c) return <Page title="Not found"><Btn label="Back" onPress={() => setView({ k: "list" })} /></Page>;
    const pk = c.keyChange ? c.keyChange.pk : c.pk;
    const shown = fingerprintText(pk);
    return (
      <Page title={`Is this really ${c.keyChange?.name ?? c.name}?`} intro="Phone or meet them. Ask them to open ScamCircle, tap People and read out their code words.">
        <Txt style={{ fontWeight: "700" }}>These are the words we got for them:</Txt>
        <Words pk={pk} />
        <Txt v="heading" header style={{ marginTop: space.s }}>Do they match what they read out?</Txt>
        <Btn label="Yes, they match" onPress={async () => { const r = verifyContact(dev, c.id, shown, now()); if (r.ok) { await updateDev(() => r.state); setView({ k: "list" }); } else setErr(r.message); }} />
        <Btn kind="secondary" label="No, they are different" onPress={async () => { if (c.keyChange) await updateDev((d) => { const r = rejectKeyChange(d, c.id); return r.ok ? r.state : d; }); setView({ k: "remove", id: c.id }); }} />
        {err ? <Notice tone="bad" text={err} /> : null}
        <Txt v="small" color={th.textMuted}>Use a different way to talk from the one you used to swap codes. If the words differ, someone may be in the middle. Do not share anything with this person.</Txt>
        <Btn kind="quiet" label="Not now" onPress={() => setView({ k: "list" })} />
      </Page>
    );
  }
  if (view.k === "remove") {
    const c = dev.contacts.find((x) => x.id === view.id);
    if (!c) return <Page title="Removed"><Btn label="Back" onPress={() => setView({ k: "list" })} /></Page>;
    const active = dev.cases.flatMap((k) => k.grants).filter((g) => g.contactPk === c.pk && g.status === "active").length;
    return (
      <Page title={`Remove ${c.name}?`}>
        <ConfirmCard danger title={`Remove ${c.name} from your trusted people?`} yes="Yes, remove them" no="No, keep them" onNo={() => setView({ k: "list" })}
          body={[`${c.name} will not get anything more from you, and replies from them will be ignored.`, active ? `${active} open request${active === 1 ? "" : "s"} will be stopped in this app. Anything they already saw or copied cannot be taken back.` : "They have no open requests.", "Their phone is not told unless you send them a stop code."]}
          onYes={async () => { await updateDev((d) => removeContact(d, c.id, now()).state); setView({ k: "list" }); }} />
      </Page>
    );
  }

  const changed = dev.contacts.filter((c) => c.keyChange);
  return (
    <Page title="Trusted people" intro="People who can look at a message with you. Both of you need ScamCircle.">
      <Notice tone="wait" title="Not automatic" text="ScamCircle has no server. You pass codes to each other yourselves (copy, or the phone's share sheet). It cannot tell you whether a code arrived or whether they replied." />
      {changed.map((c) => (
        <Card key={c.id} tone="bad">
          <Txt v="heading" header>{`${c.name} has a new code`}</Txt>
          <Txt>This could be a new phone, or someone pretending to be them. They cannot get anything until you check again.</Txt>
          <Btn label="Check the new words" onPress={() => setView({ k: "verify", id: c.id })} />
          <Btn kind="secondary" label="Ignore the new code" onPress={() => updateDev((d) => { const r = rejectKeyChange(d, c.id); return r.ok ? r.state : d; })} />
        </Card>
      ))}
      {dev.contacts.length === 0 ? (
        <EmptyState icon="people" title="No trusted people yet" body="Add someone you know and trust. You will swap codes, then read a few words out to each other." action={<Btn label="Add a person" icon="add" onPress={() => { setErr(""); setView({ k: "add1" }); }} />} />
      ) : (
        <>
          {dev.contacts.map((c) => (
            <Card key={c.id}>
              <Txt v="heading" header>{c.name}</Txt>
              <ContactChip c={c} />
              {c.status !== "verified" || c.keyChange ? <Btn label="Check their words" onPress={() => setView({ k: "verify", id: c.id })} /> : <Txt v="small" color={th.textMuted}>{c.verifiedAt ? `Checked ${when(c.verifiedAt)}.` : ""}</Txt>}
              <Btn kind="secondary" label={`Remove ${c.name}`} onPress={() => setView({ k: "remove", id: c.id })} />
            </Card>
          ))}
          <Btn label="Add a person" icon="add" onPress={() => { setErr(""); setView({ k: "add1" }); }} />
        </>
      )}
      <Card tone="info">
        <Txt v="heading" header>My code words</Txt>
        <Txt>When someone adds you, they will ask you to read these out.</Txt>
        <Words pk={dev.identity.pk} />
        <Txt v="small" color={th.textMuted}>{`Name: ${dev.identity.name}`}</Txt>
      </Card>

      <Txt v="heading" header style={{ marginTop: space.s }}>Numbers and places I already trust</Txt>
      <Txt style={{ marginBottom: space.xs }}>For example “Alex's number saved in my phone”. Add these before a message arrives. Ones added later do not count as trusted beforehand.</Txt>
      {dev.routes.map((r) => (
        <Card key={r.id}><Txt>{r.label}</Txt><Txt v="small" color={th.textMuted}>{`Added ${when(r.addedAt)}`}</Txt><Btn kind="secondary" label={`Remove “${r.label}”`} onPress={() => updateDev((d) => removeRoute(d, r.id))} /></Card>
      ))}
      <Field label="Add a trusted number or place" value={routeLabel} onChange={setRouteLabel} placeholder="e.g. Sam's number in my contacts" />
      <Btn kind="secondary" label="Add" disabled={routeLabel.trim().length < 2} onPress={async () => { await updateDev((d) => addRoute(d, routeLabel, now())); setRouteLabel(""); }} />
    </Page>
  );
}
