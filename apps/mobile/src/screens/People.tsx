import React, { useState } from "react";
import { View } from "react-native";
import {
  addRoute, fingerprintText, fingerprintWords, importContactCode, myContactCode, myFingerprint, parseContactCode, rejectKeyChange, removeContact, removeRoute, renameMe, verifyContact, type Contact
} from "@scamcircle/core";
import { Banner, Btn, Card, Chip, ConfirmCard, Field, Screen, T } from "../ui";
import { CodeBox, when } from "../common";
import { colors, useFont } from "../theme";
import { useStore } from "../store";

type V = { v: "list" } | { v: "add1" } | { v: "add2" } | { v: "verify"; id: string } | { v: "remove"; id: string };

function Words({ pk }: { pk: string }) {
  const f = useFont();
  return (
    <View accessible accessibilityLabel={`Code words: ${fingerprintText(pk)}`} style={{ backgroundColor: colors.accentSoft, borderRadius: 16, padding: 16, marginVertical: 8, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {fingerprintWords(pk).map((w, i) => <T key={i} style={{ fontSize: Math.round(f.h2 * 1.1), fontWeight: "700", color: colors.accent }}>{w}</T>)}
    </View>
  );
}

export function contactChip(c: Contact) {
  if (c.keyChange) return <Chip tone="warn" symbol="⚠" text="Code changed. Check again" />;
  if (c.status === "verified") return <Chip tone="ok" symbol="✓" text={c.kind === "demo" ? "Demo helper (simulated)" : "Words checked"} />;
  return <Chip tone="amber" symbol="●" text="Words not checked yet" />;
}

export function People({ onHome }: { onHome: () => void }) {
  const { dev, updateDev, now } = useStore();
  const [view, setView] = useState<V>({ v: "list" });
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState("");
  const [myName, setMyName] = useState(dev.identity.name);
  const [routeLabel, setRouteLabel] = useState("");

  if (view.v === "add1") {
    return (
      <Screen title="Give them your code" step="Step 1 of 2" onHome={onHome}>
        <T style={{ marginBottom: 8 }}>Send your code to the person you trust. It holds your name and a public key. It does not hold any of your messages.</T>
        <Field label="Your name, as they will see it" value={myName} onChangeText={setMyName} />
        <Btn label="Save my name" onPress={() => updateDev((d) => renameMe(d, myName))} />
        <CodeBox label="Your contact code" code={myContactCode({ ...dev, identity: { ...dev.identity, name: dev.identity.name } })} />
        <Btn kind="primary" label="Next: paste their code" onPress={() => setView({ v: "add2" })} />
        <Btn kind="link" label="Back" onPress={() => setView({ v: "list" })} />
      </Screen>
    );
  }
  if (view.v === "add2") {
    const parsed = paste.trim() ? parseContactCode(paste) : null;
    return (
      <Screen title="Paste their code" step="Step 2 of 2" onHome={onHome}>
        <Field label="Their contact code" value={paste} onChangeText={(t) => { setPaste(t); setErr(""); }} multiline placeholder="Starts with SCC1." />
        {parsed && !parsed.ok ? <T role="alert" style={{ color: colors.warnText, marginBottom: 8 }}>{`⚠ ${parsed.message}`}</T> : null}
        {parsed && parsed.ok ? <T style={{ marginBottom: 8 }}>{`Found: ${parsed.name}`}</T> : null}
        {err ? <T role="alert" style={{ color: colors.warnText, marginBottom: 8 }}>{`⚠ ${err}`}</T> : null}
        <Btn kind="primary" label="Add this person" disabled={!parsed || !parsed.ok} onPress={async () => {
          const r = importContactCode(dev, paste, now());
          if (!r.ok) { setErr(r.message); return; }
          await updateDev(() => r.state);
          setPaste("");
          setView({ v: "verify", id: r.contactId });
        }} />
        <Btn kind="link" label="Back" onPress={() => setView({ v: "add1" })} />
      </Screen>
    );
  }
  if (view.v === "verify") {
    const c = dev.contacts.find((x) => x.id === view.id);
    if (!c) return <Screen title="Not found" onHome={onHome}><Btn label="Back" onPress={() => setView({ v: "list" })} /></Screen>;
    const pk = c.keyChange ? c.keyChange.pk : c.pk;
    const shown = fingerprintText(pk);
    return (
      <Screen title={`Is this really ${c.keyChange?.name ?? c.name}?`} onHome={onHome}>
        <T>Phone or meet them. Ask them to open ScamCircle, tap “My trusted people” and read out their code words.</T>
        <T style={{ fontWeight: "700" }}>These are the words we got for them:</T>
        <Words pk={pk} />
        <T v="h2" role="header">Do they match what they read out?</T>
        <Btn kind="primary" label="Yes, they match" onPress={async () => {
          const r = verifyContact(dev, c.id, shown, now());
          if (r.ok) { await updateDev(() => r.state); setView({ v: "list" }); } else setErr(r.message);
        }} />
        <Btn label="No, they are different" onPress={async () => { if (c.keyChange) await updateDev((d) => { const r = rejectKeyChange(d, c.id); return r.ok ? r.state : d; }); setView({ v: "remove", id: c.id }); }} />
        {err ? <T role="alert">{`⚠ ${err}`}</T> : null}
        <T v="muted">Use a different way to talk from the one you used to swap codes. If the words differ, someone may be in the middle. Do not share anything with this person.</T>
        <Btn kind="link" label="Not now" onPress={() => setView({ v: "list" })} />
      </Screen>
    );
  }
  if (view.v === "remove") {
    const c = dev.contacts.find((x) => x.id === view.id);
    if (!c) return <Screen title="Removed" onHome={onHome}><Btn label="Back" onPress={() => setView({ v: "list" })} /></Screen>;
    const active = dev.cases.flatMap((k) => k.grants).filter((g) => g.contactPk === c.pk && g.status === "active").length;
    return (
      <Screen title={`Remove ${c.name}?`} onHome={onHome}>
        <ConfirmCard danger title={`Remove ${c.name} from your trusted people?`} confirmLabel="Yes, remove them" onCancel={() => setView({ v: "list" })}
          lines={[`${c.name} will not get anything more from you, and replies from them will be ignored.`, active ? `${active} open request${active === 1 ? "" : "s"} will be stopped in this app. Anything they already saw or copied cannot be taken back.` : "They have no open requests.", "Their phone is not told unless you send them a stop code."]}
          onConfirm={async () => { await updateDev((d) => removeContact(d, c.id, now()).state); setView({ v: "list" }); }} />
      </Screen>
    );
  }

  const changed = dev.contacts.filter((c) => c.keyChange);
  return (
    <Screen title="My trusted people" onHome={onHome}>
      {changed.map((c) => (
        <Card key={c.id} tone="warn">
          <T v="h2" role="header">{`⚠ ${c.name} has a new code`}</T>
          <T>This could be a new phone, or someone pretending to be them. They cannot get anything until you check again.</T>
          <Btn kind="primary" label="Check the new words" onPress={() => setView({ v: "verify", id: c.id })} />
          <Btn label="Ignore the new code" onPress={() => updateDev((d) => { const r = rejectKeyChange(d, c.id); return r.ok ? r.state : d; })} />
        </Card>
      ))}
      <Card tone="accent">
        <T v="h2" role="header">My code words</T>
        <T>When someone adds you, they will ask you to read these out.</T>
        <Words pk={dev.identity.pk} />
        <T v="muted" role="text">{`Name: ${dev.identity.name}`}</T>
      </Card>
      {dev.contacts.length === 0 ? (
        <Card><T>No trusted people yet. Add someone you know and trust.</T></Card>
      ) : dev.contacts.map((c) => (
        <Card key={c.id}>
          <T v="h2" role="header">{c.name}</T>
          {contactChip(c)}
          {c.status !== "verified" || c.keyChange ? <Btn kind="primary" label="Check their words" onPress={() => setView({ v: "verify", id: c.id })} /> : <T v="muted">{c.verifiedAt ? `Checked ${when(c.verifiedAt)}.` : ""}</T>}
          <Btn label={`Remove ${c.name}`} onPress={() => setView({ v: "remove", id: c.id })} />
        </Card>
      ))}
      <Btn kind="primary" label="Add a person" onPress={() => { setErr(""); setView({ v: "add1" }); }} />

      <T v="h2" role="header" style={{ marginTop: 16, marginBottom: 8 }}>Numbers and places I already trust</T>
      <T style={{ marginBottom: 8 }}>For example “Alex's number saved in my phone”. Add these before a message arrives. Ones added later do not count as trusted beforehand.</T>
      {dev.routes.map((r) => (
        <Card key={r.id}><T>{r.label}</T><T v="muted">{`Added ${when(r.addedAt)}`}</T><Btn label={`Remove “${r.label}”`} onPress={() => updateDev((d) => removeRoute(d, r.id))} /></Card>
      ))}
      <Field label="Add a trusted number or place" value={routeLabel} onChangeText={setRouteLabel} placeholder="e.g. Sam's number in my contacts" />
      <Btn label="Add" disabled={routeLabel.trim().length < 2} onPress={async () => { await updateDev((d) => addRoute(d, routeLabel, now())); setRouteLabel(""); }} />
    </Screen>
  );
}
