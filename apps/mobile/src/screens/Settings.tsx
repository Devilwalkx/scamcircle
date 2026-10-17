import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { encryptionSelfCheck, type SelfCheckResult, connectDemo, createDevice, loadSyntheticExample, DEMO_REVIEWER_NAME, DATASET, HOLDOUT2, evaluate, type Row } from "@scamcircle/core";
import { Btn, Bullets, Card, Choice, Collapsible, ConfirmCard, DemoStrip, Field, LinkRow, Notice, Txt, TEXT_SIZES } from "../ui";
import { Page } from "../page";
import { CodeBox } from "../parts";
import { useStore } from "../store";
import { useView } from "../nav";
import { useTheme } from "../design/theme";
import { space } from "../design/tokens";
import { buildInfo } from "../buildInfo";
import { expoKeyStore } from "../keystore";
import type { Prefs } from "../../App";

type V = { k: "main" } | { k: "offline" } | { k: "eval" } | { k: "limits" } | { k: "erase" } | { k: "restore" } | { k: "backup" } | { k: "demo" };

export function Settings({ prefs }: { prefs: Prefs }) {
  const { root, svc, updateRoot, now, viewer, setViewer, clockOffset, setClockOffset, replaceRoot } = useStore();
  const th = useTheme();
  const [view, setView] = useView<V>({ k: "main" });
  const [secret, setSecret] = useState<string | null>(null);
  const [backup, setBackup] = useState("");
  const [msg, setMsg] = useState("");
  const [bText, setBText] = useState("");
  const [bSecret, setBSecret] = useState("");
  const [hasRec, setHasRec] = useState<boolean | null>(null);
  const [confirmDemo, setConfirmDemo] = useState(false);
  React.useEffect(() => { svc.hasRecovery().then(setHasRec).catch(() => setHasRec(false)); }, [svc, secret]);
  const [check, setCheck] = useState<SelfCheckResult | "running" | null>(null);
  const info = buildInfo();

  if (view.k === "offline") return <Offline />;
  if (view.k === "eval") return <Evaluation />;
  if (view.k === "limits") {
    return (
      <Page title="What this app cannot do">
        <Card>
          <Bullets items={[
            "It cannot tell you a message is real or that it is fine to pay. It only points out warning signs, and it misses some.",
            "It reads English wording only. It cannot read pictures: if a message is in a picture you type out the words.",
            "It never opens links, so it cannot tell where a link leads.",
            "It has no internet permission, so it cannot send anything by itself. Codes and text move only when you copy or share them. It cannot tell you whether something you sent arrived or whether anyone replied.",
            "It is not an emergency or monitored service and cannot contact anyone for you.",
            "Stopping a shared request closes it in the app. It cannot take back what someone already saw, copied or screenshotted.",
            "The way private codes are locked and how people check each other's words has not been reviewed by an independent expert. Do not use it for real private information yet.",
            "Do not read test results as protection. See “How well does the checker work?”."
          ]} />
        </Card>
        <Card><Txt v="heading" header>Lock screen and app switcher</Txt><Txt>This build does not hide the app's contents in the phone's recent-apps view, and it cannot stop screenshots. It sends no notifications, so nothing appears on the lock screen.</Txt></Card>
      </Page>
    );
  }
  if (view.k === "erase") {
    return (
      <Page title="Erase everything?">
        <ConfirmCard danger title="Erase all data on this phone?" yes="Yes, erase everything" no="No, keep my data" onNo={() => setView({ k: "main" })}
          body={["This deletes every message, trusted person, request, reply, unfinished text and your keys from this phone.", "It cannot be undone unless you made a backup and kept your recovery secret.", "People you shared with keep anything they already saw or copied."]}
          onYes={async () => { await svc.erase(); replaceRoot(null); }} />
      </Page>
    );
  }
  if (view.k === "backup") {
    return (
      <Page title="Backup" intro="A backup is encrypted (XChaCha20-Poly1305) with this phone's key. That key is locked inside the backup with your recovery secret. The backup text on its own cannot be read; the backup text together with your recovery secret can. Keep them apart.">
        {backup ? <CodeBox label="Backup text" code={backup} copyLabel="Copy backup" shareLabel="Share backup…" /> : <Btn label="Make a backup" disabled={hasRec === false} onPress={async () => { try { setBackup(await svc.exportBackup(root)); setMsg(""); } catch (e) { setMsg(e instanceof Error ? e.message : "Could not make a backup."); } }} />}
        {hasRec === false ? <Notice tone="wait" text="Make a recovery secret first (Settings, Your data)." /> : null}
        {msg ? <Notice tone="bad" text={msg} /> : null}
      </Page>
    );
  }
  if (view.k === "restore") {
    return (
      <Page title="Restore a backup" intro="This replaces what is on this phone with the backup. Anything you deleted since is deleted again.">
        <Field label="Backup text" value={bText} onChange={setBText} multiline placeholder="Starts with SCB1." />
        <Field label="Recovery secret" value={bSecret} onChange={setBSecret} placeholder="XXXX-XXXX-XXXX-…" />
        {msg ? <Notice tone="bad" text={msg} /> : null}
        <Btn label="Restore" disabled={!bText || !bSecret} onPress={async () => { try { const r = await svc.restoreBackup(bText, bSecret); replaceRoot(r); setMsg(""); setView({ k: "main" }); } catch (e) { setMsg(e instanceof Error ? e.message : "Could not restore."); } }} />
      </Page>
    );
  }
  if (view.k === "demo") {
    return (
      <Page title="Demonstration tools">
        <DemoStrip text="DEMONSTRATION ONLY. These controls pretend there is a second person on this same phone. That is a simulation. It does not show real delivery between two phones, and it is not part of normal use." />
        <Btn kind="secondary" label="Load the example story" hint="Adds a made-up case, a pretend helper and a trusted number to your data" onPress={() => setConfirmDemo(true)} />
        {confirmDemo ? (
          <ConfirmCard title="Add the example story?" yes="Yes, add it" no="No" onNo={() => setConfirmDemo(false)}
            body={["This adds a made-up message, a pretend helper called “Demo helper (same phone)” and a made-up trusted number to the data on this phone.", "You can delete the message and remove the helper afterwards."]}
            onYes={async () => { setConfirmDemo(false); await updateRoot((r) => loadSyntheticExample(r, now()).root); setMsg("Example story added. Find it under Recent checks."); }} />
        ) : null}
        {!root.demo ? <Btn kind="secondary" label="Add a pretend second person" hint="A pretend trusted person that lives on this phone" onPress={() => updateRoot((r) => { const d = createDevice(DEMO_REVIEWER_NAME, now()); const c = connectDemo(r.me, d, now()); return { me: c.me, demo: c.demo }; })} /> : (
          <Btn kind="secondary" label={viewer === "demo" ? "Go back to my own view" : "Look at the app as the pretend helper"} onPress={() => setViewer(viewer === "demo" ? "me" : "demo")} selected={viewer === "demo"} />
        )}
        <Txt v="heading" header style={{ marginTop: space.s }}>Pretend time passes</Txt>
        <Txt>{clockOffset ? `Pretending ${Math.round(clockOffset / 3600_000)} hours have passed.` : "Using the real time."}</Txt>
        <Btn kind="secondary" label="Pretend 1 day passes" onPress={() => setClockOffset(clockOffset + 24 * 3600_000)} />
        <Btn kind="secondary" label="Pretend 3 days pass" onPress={() => setClockOffset(clockOffset + 72 * 3600_000)} />
        <Btn kind="secondary" label="Use the real time" onPress={() => setClockOffset(0)} />
        {msg ? <Notice tone="info" text={msg} /> : null}
      </Page>
    );
  }

  return (
    <Page title="Settings">
      <Txt v="heading" header>Display</Txt>
      <Txt v="label">Colours</Txt>
      <View accessibilityRole="radiogroup" accessibilityLabel="Colours">
        {([["system", "Match the phone"], ["light", "Light"], ["dark", "Dark"]] as const).map(([id, label]) => <Btn key={id} role="radio" kind="secondary" selected={prefs.themePref === id} label={label} onPress={() => prefs.setThemePref(id)} />)}
      </View>
      <Txt v="label" style={{ marginTop: space.xs }}>Text size</Txt>
      <Txt v="small" color={th.textMuted}>This adds to the text size in your phone's own settings.</Txt>
      <View accessibilityRole="radiogroup" accessibilityLabel="Text size">
        {TEXT_SIZES.map((t) => <Btn key={t.id} role="radio" kind="secondary" selected={prefs.size === t.id} label={t.label} onPress={() => prefs.setSize(t.id)} />)}
      </View>

      <Txt v="heading" header style={{ marginTop: space.s, marginBottom: space.xs }}>Privacy and limits</Txt>
      <LinkRow icon="offline" title="Works without internet" detail="What works offline and why the app has no internet permission" onPress={() => setView({ k: "offline" })} />
      <LinkRow icon="info" title="How well does the checker work?" detail="Small tests on made-up messages, and what they do not show" onPress={() => setView({ k: "eval" })} />
      <LinkRow icon="help" title="What this app cannot do" onPress={() => setView({ k: "limits" })} />

      <Txt v="heading" header style={{ marginTop: space.s }}>Your data</Txt>
      <Txt>Everything is encrypted on this phone (XChaCha20-Poly1305). The key is kept in Android's protected storage for this app only and is not included in Android backups. If you lose this phone and have no recovery secret, everything here is gone for good. Nobody can reset it for you.</Txt>
      <Btn kind="secondary" label={hasRec ? "Make a new recovery secret" : "Make a recovery secret"} onPress={async () => setSecret(await svc.createRecovery(root.me.accountId))} />
      {secret ? <Card tone="wait"><Txt>Write this down now. It is shown once and not saved.</Txt><Txt selectable label="Recovery secret, shown once" style={{ fontWeight: "700" }}>{secret}</Txt></Card> : null}
      <Btn kind="secondary" label="Make a backup" onPress={() => { setMsg(""); setBackup(""); setView({ k: "backup" }); }} />
      <Btn kind="secondary" label="Restore a backup" onPress={() => { setMsg(""); setView({ k: "restore" }); }} />
      <Btn kind="danger" label="Erase everything" onPress={() => setView({ k: "erase" })} />

      <Txt v="heading" header style={{ marginTop: space.s }}>About this build</Txt>
      <Card accessibilityLabel="About this build">
        <Txt v="small">{`Version ${info.version} (build ${info.code})`}</Txt>
        <Txt v="small">{`App ID ${info.id}`}</Txt>
        <Txt v="small">{`Commit ${info.commit}${info.builtAt ? ` · built ${info.builtAt}` : ""}`}</Txt>
        <Txt v="small" color={th.textMuted}>Test build, signed with the public Android test key. Not reviewed by anyone independent. Not tested on a physical phone by its builders.</Txt>
      </Card>
      <Btn kind="secondary" label="Check encryption on this phone" onPress={async () => { setCheck("running"); setCheck(await encryptionSelfCheck(expoKeyStore)); }} />
      {check === "running" ? <Notice tone="wait" text="Checking…" /> : check ? (
        <Card accessibilityLabel="Encryption check result">
          <Txt v="heading" header>{check.ok ? "Encryption check: passed" : "Encryption check: FAILED"}</Txt>
          {check.steps.map((st) => <Txt key={st.label}>{`${st.ok ? "Passed" : "Failed"}: ${st.label}`}</Txt>)}
          <Txt v="small" color={th.textMuted}>This runs the app's real encryption on made-up text. It shows none of your data and does not prove the encryption is unbreakable.</Txt>
        </Card>
      ) : null}
      <Collapsible title="Demonstration tools (not for real use)"><Txt>Pretend second person, example story and pretend clock, for trying the app on one phone.</Txt><Btn kind="secondary" label="Open demonstration tools" onPress={() => { setMsg(""); setView({ k: "demo" }); }} /></Collapsible>
    </Page>
  );
}

function Offline() {
  const th = useTheme();
  return (
    <Page title="Works without internet" intro="ScamCircle is built to work with no connection at all, and it has no way to use one.">
      <Card>
        <Txt v="heading" header>These work offline</Txt>
        <Bullets items={["Checking a message for warning signs", "Saving checks, and the list of recent checks", "Adding trusted people and comparing code words", "Making private codes, opening codes and replies", "Backup and restore (as text you keep)", "Handing text or a cropped picture to the share sheet. The app you pick for sending may need its own connection."]} />
      </Card>
      <Card>
        <Txt v="heading" header>Why there is no internet permission</Txt>
        <Txt>On purpose, ScamCircle does not ask Android for permission to use the internet. That means the app itself cannot upload your messages, contacts or pictures, and cannot look anything up. Nothing leaves the phone unless you copy something or use the share sheet and choose an app and a person.</Txt>
        <Txt>This is a design choice, not a fault. If you look in your phone's settings you may see no internet access for this app. That is expected.</Txt>
      </Card>
      <Card>
        <Txt v="heading" header>What that means for you</Txt>
        <Bullets items={["No delivery receipts and no reply notifications. You send and receive codes yourselves, and you ask the other person directly whether it arrived.", "Links are never opened, and addresses are never looked up. They are judged only by how they are written.", "The warning-sign rules change only when the app is updated.", "No account, no sign-in, and no way for us to recover your data. Keep your recovery secret."]} />
      </Card>
      <Txt v="small" color={th.textMuted}>Not tested on a physical phone. In the Android emulator the installed app was checked to list no internet permission.</Txt>
    </Page>
  );
}

function pct(n: number, d: number) { return d === 0 ? "none" : `${n} of ${d}`; }
function Line({ r, label }: { r: Row; label: string }) {
  const th = useTheme();
  return (
    <Card>
      <Txt v="heading" header>{label}</Txt>
      <Txt v="small" color={th.textMuted}>{`${r.n} made-up messages: ${r.scams} scam, ${r.legit} ordinary. ${r.cannotAssess} could not be read (not English, or unreadable) and are counted separately.`}</Txt>
      <Txt>{`Scam messages given no warning signs: ${pct(r.falseReassurance, r.scams)}.`}</Txt>
      <Txt>{`Ordinary messages given warning signs: ${pct(r.falseAlarm, r.legit)}.`}</Txt>
    </Card>
  );
}

function Evaluation() {
  const th = useTheme();
  const rows = useMemo(() => ({
    a: evaluate(DATASET.filter((s) => !s.heldOut)).overall,
    b: evaluate(DATASET.filter((s) => s.heldOut)).overall,
    c: evaluate(HOLDOUT2).overall
  }), []);
  return (
    <Page title="How well does the checker work?" intro="Short answer: we do not know how well it protects real people. This is what the small tests show.">
      <Notice tone="wait" title="Not proof of protection" text="These are small sets of made-up messages, all written by the people who built the app. A real scam that avoids these wording patterns gets no warning signs at all. Passing these tests does not mean ScamCircle will catch a real scam." />
      <Line r={rows.c} label="Newest test (written after the last rule changes, not tuned on)" />
      <Line r={rows.b} label="Older test, now used for regression only (rules were changed after seeing it)" />
      <Line r={rows.a} label="Test the rules were written against (always looks good)" />
      <Txt v="small" color={th.textMuted}>The first line is the fairest of the three, and it still shows real misses. Details and the exact messages are in the project's docs (EVALUATION.md). No independent person has tested this app.</Txt>
    </Page>
  );
}
