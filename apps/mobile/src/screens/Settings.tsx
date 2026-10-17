import React, { useState } from "react";
import { Platform } from "react-native";
import { connectDemo, createDevice, loadSyntheticExample, DEMO_REVIEWER_NAME } from "@scamcircle/core";
import { Banner, Btn, Card, ConfirmCard, Field, Screen, T } from "../ui";
import { colors, TEXT_SIZES, type TextSizeId } from "../theme";
import { useStore } from "../store";
import { CodeBox } from "../common";

type V = "main" | "demo" | "limits" | "erase" | "restore" | "backup";

export function Settings({ onHome, textSize, setTextSize }: { onHome: () => void; textSize: TextSizeId; setTextSize: (t: TextSizeId) => void }) {
  const { root, svc, updateRoot, now, viewer, setViewer, clockOffset, setClockOffset, replaceRoot } = useStore();
  const [v, setV] = useState<V>("main");
  const [secret, setSecret] = useState<string | null>(null);
  const [backup, setBackup] = useState("");
  const [msg, setMsg] = useState("");
  const [bText, setBText] = useState("");
  const [bSecret, setBSecret] = useState("");
  const [hasRec, setHasRec] = useState<boolean | null>(null);
  React.useEffect(() => { svc.hasRecovery().then(setHasRec).catch(() => setHasRec(false)); }, [svc, secret]);

  if (v === "limits") {
    return (
      <Screen title="What this app cannot do" onHome={onHome}>
        <Card>
          {[
            "It cannot tell you a message is real or safe. It only points out warning signs.",
            "It reads English wording only. It cannot read pictures: you type out screenshots.",
            "It never opens links, so it cannot tell where a link leads.",
            "It does not send anything by itself. Codes move only when you copy or share them.",
            "It is not an emergency or monitored service and cannot contact anyone for you.",
            "Stopping a shared request closes it in the app. It cannot take back what someone already saw, copied or screenshotted.",
            "The way codes are locked and how people check each other's words has not been reviewed by an independent expert. Do not use it with real private information.",
            "Everything here is a synthetic demo with made-up data."
          ].map((t, i) => <T key={i}>{`• ${t}`}</T>)}
        </Card>
        <Card><T v="h2" role="header">Lock screen and app switcher</T><T>This build does not hide the app's contents in the phone's recent-apps view, and it cannot stop screenshots. It sends no notifications, so nothing appears on the lock screen.</T></Card>
        <Btn label="Back to settings" onPress={() => setV("main")} />
      </Screen>
    );
  }
  if (v === "erase") {
    return (
      <Screen title="Erase everything?" onHome={onHome}>
        <ConfirmCard danger title="Erase all data on this phone?" confirmLabel="Yes, erase everything" onCancel={() => setV("main")}
          lines={["This deletes every message, trusted person, request, reply and your keys from this phone.", "It cannot be undone unless you made a backup and kept your recovery secret.", "People you shared with keep anything they already saw or copied."]}
          onConfirm={async () => { await svc.erase(); replaceRoot(null); }} />
      </Screen>
    );
  }
  if (v === "backup") {
    return (
      <Screen title="Backup" onHome={onHome}>
        <T>A backup is scrambled with your device key, which is itself locked with your recovery secret. Keep both safe and apart. Anyone holding both can read it.</T>
        {backup ? <CodeBox label="Backup text" code={backup} copyLabel="Copy backup" shareLabel="Share backup…" /> : <Btn kind="primary" label="Make a backup" disabled={hasRec === false} onPress={async () => { try { setBackup(await svc.exportBackup(root)); setMsg(""); } catch (e) { setMsg(e instanceof Error ? e.message : "Could not make a backup."); } }} />}
        {hasRec === false ? <T role="alert">Make a recovery secret first.</T> : null}
        {msg ? <T role="alert">{`⚠ ${msg}`}</T> : null}
        <Btn label="Back to settings" onPress={() => { setBackup(""); setV("main"); }} />
      </Screen>
    );
  }
  if (v === "restore") {
    return (
      <Screen title="Restore a backup" onHome={onHome}>
        <T>This replaces what is on this phone with the backup. Anything you deleted since is deleted again.</T>
        <Field label="Backup text" value={bText} onChangeText={setBText} multiline placeholder="Starts with SCB1." />
        <Field label="Recovery secret" value={bSecret} onChangeText={setBSecret} placeholder="XXXX-XXXX-XXXX-…" />
        {msg ? <T role="alert" style={{ color: colors.warnText }}>{`⚠ ${msg}`}</T> : null}
        <Btn kind="primary" label="Restore" disabled={!bText || !bSecret} onPress={async () => { try { const r = await svc.restoreBackup(bText, bSecret); replaceRoot(r); setMsg(""); setV("main"); } catch (e) { setMsg(e instanceof Error ? e.message : "Could not restore."); } }} />
        <Btn label="Back to settings" onPress={() => setV("main")} />
      </Screen>
    );
  }
  if (v === "demo") {
    return (
      <Screen title="Demo options" onHome={onHome}>
        <Banner text="These controls are for trying the app on one phone. They are not part of normal use." />
        <Btn kind="primary" label="Load the example story" hint="Adds a made-up case with a sample helper" onPress={async () => { await updateRoot((r) => loadSyntheticExample(r, now()).root); setMsg("Example added. Find it under Recent checks on Home."); }} />
        {!root.demo ? <Btn label="Add a demo second person" hint="A pretend trusted person that lives on this phone" onPress={() => updateRoot((r) => { const d = createDevice(DEMO_REVIEWER_NAME, now()); const c = connectDemo(r.me, d, now()); return { me: c.me, demo: c.demo }; })} /> : (
          <Btn label={viewer === "demo" ? "Go back to my own view" : "Look at the app as the demo helper"} onPress={() => setViewer(viewer === "demo" ? "me" : "demo")} selected={viewer === "demo"} />
        )}
        <T v="h2" role="header" style={{ marginVertical: 8 }}>Demo clock</T>
        <T>{clockOffset ? `Pretending ${Math.round(clockOffset / 3600_000)} hours have passed.` : "Using the real time."}</T>
        <Btn label="Pretend 1 day passes" onPress={() => setClockOffset(clockOffset + 24 * 3600_000)} />
        <Btn label="Pretend 3 days pass" onPress={() => setClockOffset(clockOffset + 72 * 3600_000)} />
        <Btn label="Use the real time" onPress={() => setClockOffset(0)} />
        {msg ? <T role="alert">{msg}</T> : null}
        <Btn kind="link" label="Back to settings" onPress={() => { setMsg(""); setV("main"); }} />
      </Screen>
    );
  }
  return (
    <Screen title="Settings and privacy" onHome={onHome}>
      <Card>
        <T v="h2" role="header">Your data stays on this phone</T>
        <T>{Platform.OS === "web" ? "Everything is locked on this device. This is the browser version: the key lives in the browser, which is weaker than the phone app. Clearing site data deletes it for good." : "Everything is locked with a key kept in the phone's secure storage. This app asks for no internet access, so it cannot send anything by itself."}</T>
      </Card>
      <T v="h2" role="header" style={{ marginBottom: 6 }}>Text size</T>
      {TEXT_SIZES.map((t) => <Btn key={t.id} role="radio" label={t.label} selected={textSize === t.id} onPress={() => setTextSize(t.id)} />)}
      <T v="h2" role="header" style={{ marginVertical: 8 }}>Recovery</T>
      <T style={{ marginBottom: 8 }}>If you lose this phone and have no recovery secret, everything here is gone for good. Nobody can reset it for you.</T>
      <Btn label={hasRec ? "Make a new recovery secret" : "Make a recovery secret"} onPress={async () => setSecret(await svc.createRecovery(root.me.accountId))} />
      {secret ? <Card tone="amber"><T>Write this down now. It is shown once and not saved.</T><T selectable label="Recovery secret, shown once" style={{ fontWeight: "700" }}>{secret}</T></Card> : null}
      <Btn label="Make a backup" onPress={() => setV("backup")} />
      <Btn label="Restore a backup" onPress={() => { setMsg(""); setV("restore"); }} />
      <T v="h2" role="header" style={{ marginVertical: 8 }}>More</T>
      <Btn label="What this app cannot do" onPress={() => setV("limits")} />
      <Btn label="Demo options" onPress={() => { setMsg(""); setV("demo"); }} />
      <Btn kind="danger" label="Erase everything" onPress={() => setV("erase")} />
    </Screen>
  );
}
