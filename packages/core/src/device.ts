import { z } from "zod";
import { assess, type Assessment } from "./indicators.js";
import { applyRedactions, type Range } from "./redact.js";
import { VERIFICATION_METHODS, STEP_OUTCOMES, isIndependentMethod, methodById, stepCompletes, type StepOutcome } from "./methods.js";
import { fingerprintText, isUsablePublicKey, makeContactCode, newIdentity, parseContactCode, type Identity } from "./identity.js";
import { openMessage, parseWire, sealMessage, MAX_MESSAGE_CHARS } from "./sealedbox.js";
import { cleanDisplayText, randomHex } from "./util.js";

/**
 * Everything one phone knows, as plain data, with pure functions to change it.
 * Time is always passed in. Messages from other people are data: importing one can add an inbox item or a
 * reply record and nothing else. Nothing here sends anything; "sending" is the user copying a string.
 */

export const NO_RESPONSE_AFTER_MS = 24 * 3600_000;
export const MIN_TTL_MS = 5 * 60_000;
export const MAX_TTL_MS = 30 * 24 * 3600_000;
const CLOCK_SKEW_MS = 5 * 60_000;
export const MAX_SHARED_CHARS = 8000;
export const MAX_CASE_CHARS = 20000;

export type ContactStatus = "unverified" | "verified";
export interface Contact {
  id: string; name: string; pk: string; kind: "person" | "demo"; status: ContactStatus;
  addedAt: number; verifiedAt?: number;
  /** A different key arrived under the same name. The contact stays unverified until re-checked. */
  keyChange?: { pk: string; name: string; detectedAt: number };
}
export interface TrustedRoute { id: string; label: string; addedAt: number }
export interface Step { id: string; at: number; method: string; outcome: StepOutcome; routeId?: string; completes: boolean; note?: string }
export type ReplyClass = "verification_step_completed" | "opinion_only" | "not_verified";
export interface ReplyRecord {
  version: number; method: string; outcome: StepOutcome; findings: string; checkedAt: number; respondedAt: number; receivedAt: number; cls: ReplyClass;
}
export interface Grant {
  id: string; contactPk: string; contactName: string; createdAt: number; expiresAt: number; status: "active" | "revoked";
  sharedText: string; note: string; labels: string[]; markedSentAt?: number; revokedAt?: number; replies: ReplyRecord[];
}
export interface CaseRecord {
  id: string; title: string; createdAt: number; source: "paste" | "screenshot" | "demo"; text: string;
  assessment: Assessment; steps: Step[]; grants: Grant[];
}
export interface MyReply { version: number; method: string; outcome: StepOutcome; findings: string; checkedAt: number; respondedAt: number }
export interface ReviewItem {
  grantId: string; ownerPk: string; ownerName: string; receivedAt: number; expiresAt: number; text: string; note: string; labels: string[];
  status: "open" | "revoked"; replies: MyReply[];
}
export interface Tombstone { kind: "case" | "inbox" | "contact"; id: string; deletedAt: number }
export interface DeviceState {
  v: 1; accountId: string; createdAt: number; identity: Identity; contacts: Contact[]; routes: TrustedRoute[];
  cases: CaseRecord[]; inbox: ReviewItem[]; seen: string[]; tombstones: Tombstone[];
}

export type Fail = { ok: false; code: string; message: string };
export type Ok<T> = { ok: true; state: DeviceState } & T;
export type Res<T = object> = Ok<T> | Fail;
const fail = (code: string, message: string): Fail => ({ ok: false, code, message });
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function createDevice(name: string, now: number): DeviceState {
  return { v: 1, accountId: randomHex(16), createdAt: now, identity: newIdentity(name), contacts: [], routes: [], cases: [], inbox: [], seen: [], tombstones: [] };
}

export function myContactCode(s: DeviceState): string { return makeContactCode(s.identity); }
export function myFingerprint(s: DeviceState): string { return fingerprintText(s.identity.pk); }
export function renameMe(s: DeviceState, name: string): DeviceState {
  const n = clone(s);
  n.identity.name = cleanDisplayText(name, 40) || n.identity.name;
  return n;
}

// ---- contacts ------------------------------------------------------------------------------

export function findContact(s: DeviceState, id: string): Contact | undefined { return s.contacts.find((c) => c.id === id); }
const contactByPk = (s: DeviceState, pk: string) => s.contacts.find((c) => c.pk === pk);
export const canReceiveCases = (c: Contact) => c.status === "verified" && !c.keyChange;

export function importContactCode(state: DeviceState, code: string, now: number): Res<{ result: "added" | "exists" | "key_change"; contactId: string }> {
  const p = parseContactCode(code);
  if (!p.ok) return fail("invalid", p.message);
  if (p.pk === state.identity.pk) return fail("self", "That is your own contact code.");
  const s = clone(state);
  const same = contactByPk(s, p.pk);
  if (same) return { ok: true, state: s, result: "exists", contactId: same.id };
  const sameName = s.contacts.find((c) => c.kind === "person" && c.name.toLowerCase() === p.name.toLowerCase());
  if (sameName) {
    // Same name, different key: could be a new phone, could be an impersonator. Never swapped silently.
    sameName.status = "unverified";
    sameName.verifiedAt = undefined;
    sameName.keyChange = { pk: p.pk, name: p.name, detectedAt: now };
    return { ok: true, state: s, result: "key_change", contactId: sameName.id };
  }
  const c: Contact = { id: p.pk.slice(0, 16), name: p.name, pk: p.pk, kind: "person", status: "unverified", addedAt: now };
  s.contacts.push(c);
  s.tombstones = s.tombstones.filter((t) => !(t.kind === "contact" && t.id === p.pk));
  return { ok: true, state: s, result: "added", contactId: c.id };
}

/** `shownWords` is the fingerprint the person was shown and said matched. If the key changed in between, this fails. */
export function verifyContact(state: DeviceState, contactId: string, shownWords: string, now: number): Res {
  const s = clone(state);
  const c = findContact(s, contactId);
  if (!c) return fail("unknown_contact", "That person is not in your list.");
  const target = c.keyChange ? c.keyChange.pk : c.pk;
  if (fingerprintText(target) !== shownWords) return fail("mismatch", "The words changed while you were checking. Nothing was confirmed.");
  if (c.keyChange) {
    c.pk = c.keyChange.pk;
    c.name = c.keyChange.name;
    c.id = c.pk.slice(0, 16);
    c.keyChange = undefined;
  }
  c.status = "verified";
  c.verifiedAt = now;
  return { ok: true, state: s };
}

/** "They did not match": drop a pending new key and leave the person unverified. */
export function rejectKeyChange(state: DeviceState, contactId: string): Res {
  const s = clone(state);
  const c = findContact(s, contactId);
  if (!c) return fail("unknown_contact", "That person is not in your list.");
  c.keyChange = undefined;
  c.status = "unverified";
  c.verifiedAt = undefined;
  return { ok: true, state: s };
}

export function renameContact(state: DeviceState, contactId: string, name: string): DeviceState {
  const s = clone(state);
  const c = findContact(s, contactId);
  if (c) c.name = cleanDisplayText(name, 40) || c.name;
  return s;
}

export interface Notice { contactName: string; text: string }

export function removeContact(state: DeviceState, contactId: string, now: number): { state: DeviceState; notices: Notice[] } {
  const s = clone(state);
  const c = findContact(s, contactId);
  if (!c) return { state: s, notices: [] };
  const notices: Notice[] = [];
  for (const cs of s.cases) {
    for (const g of cs.grants) {
      if (g.contactPk === c.pk && g.status === "active") {
        g.status = "revoked";
        g.revokedAt = now;
        notices.push({ contactName: c.name, text: sealRevoke(s, c.pk, g.id, now, g.expiresAt) });
      }
    }
  }
  s.contacts = s.contacts.filter((x) => x.id !== contactId);
  s.tombstones.push({ kind: "contact", id: c.pk, deletedAt: now });
  return { state: s, notices };
}

export function addRoute(state: DeviceState, label: string, now: number): DeviceState {
  const s = clone(state);
  const l = cleanDisplayText(label, 80);
  if (l) s.routes.push({ id: randomHex(8), label: l, addedAt: now });
  return s;
}
export function removeRoute(state: DeviceState, id: string): DeviceState {
  const s = clone(state);
  s.routes = s.routes.filter((r) => r.id !== id);
  return s;
}
/** A route only counts as previously trusted if the owner added it before the message arrived. */
export function routeWasTrustedBefore(route: TrustedRoute, c: CaseRecord): boolean { return route.addedAt < c.createdAt; }

// ---- cases ---------------------------------------------------------------------------------

export function addCase(state: DeviceState, input: { title?: string; text: string; source: CaseRecord["source"] }, now: number): Res<{ caseId: string }> {
  const text = input.text.replace(/\r\n/g, "\n");
  if (text.trim().length === 0) return fail("empty", "Type or paste the message first.");
  if (text.length > MAX_CASE_CHARS) return fail("too_long", "That message is too long. Paste the important part.");
  const s = clone(state);
  const id = randomHex(8);
  const title = cleanDisplayText(input.title ?? "", 60) || "Message " + (s.cases.length + 1);
  s.cases.unshift({ id, title, createdAt: now, source: input.source, text, assessment: assess(text), steps: [], grants: [] });
  return { ok: true, state: s, caseId: id };
}

export const findCase = (s: DeviceState, id: string) => s.cases.find((c) => c.id === id);

export function recordStep(state: DeviceState, caseId: string, input: { method: string; outcome: StepOutcome; routeId?: string; note?: string }, now: number): Res<{ completes: boolean; reason?: string }> {
  if (!methodById(input.method)) return fail("bad_method", "Choose how you checked.");
  if (!STEP_OUTCOMES.some((o) => o.id === input.outcome)) return fail("bad_outcome", "Choose what happened.");
  const s = clone(state);
  const c = findCase(s, caseId);
  if (!c) return fail("unknown_case", "That message is not on this phone.");
  let completes = stepCompletes(input.method, input.outcome);
  let reason: string | undefined;
  if (!isIndependentMethod(input.method)) reason = "That route came from the message (or was only a look), so it does not count as a check.";
  else if (!completes) reason = "You did not get a clear answer yet, so this is not a completed check.";
  if (input.routeId) {
    const r = s.routes.find((x) => x.id === input.routeId);
    if (r && !routeWasTrustedBefore(r, c)) {
      completes = false;
      reason = "That route was added after the message arrived, so it is not a route you trusted beforehand.";
    }
  }
  c.steps.push({ id: randomHex(8), at: now, method: input.method, outcome: input.outcome, routeId: input.routeId, completes, note: input.note ? cleanDisplayText(input.note, 300) : undefined });
  return { ok: true, state: s, completes, reason };
}

export function deleteCase(state: DeviceState, caseId: string, now: number): { state: DeviceState; notices: Notice[] } {
  const s = clone(state);
  const c = findCase(s, caseId);
  if (!c) return { state: s, notices: [] };
  const notices: Notice[] = [];
  for (const g of c.grants) {
    if (g.status === "active") notices.push({ contactName: g.contactName, text: sealRevoke(s, g.contactPk, g.id, now, g.expiresAt) });
  }
  s.cases = s.cases.filter((x) => x.id !== caseId);
  s.tombstones.push({ kind: "case", id: caseId, deletedAt: now });
  return { state: s, notices };
}

export function deleteInboxItem(state: DeviceState, grantId: string, now: number): DeviceState {
  const s = clone(state);
  s.inbox = s.inbox.filter((i) => i.grantId !== grantId);
  s.tombstones.push({ kind: "inbox", id: grantId, deletedAt: now });
  return s;
}

// ---- outcome -------------------------------------------------------------------------------

export type OutcomeKind = "verification_step_completed" | "pending" | "indicators_found" | "not_verified";
export interface CaseOutcome { kind: OutcomeKind; label: string; detail: string; warningSigns: number; unresolved: boolean }

export function caseOutcome(c: CaseRecord, now: number): CaseOutcome {
  const warningSigns = c.assessment.indicators.filter((i) => i.strength !== "context").length;
  const mine = c.steps.filter((x) => x.completes);
  const theirs = c.grants.flatMap((g) => g.replies.filter((r) => r.cls === "verification_step_completed").map((r) => ({ r, g })));
  const denied = mine.find((x) => x.outcome === "denied_by_real_person");
  const rDenied = theirs.find((x) => x.r.outcome === "denied_by_real_person");
  const note = " This does not make any payment safe.";
  if (denied || mine.length || theirs.length) {
    if (denied || rDenied) {
      return { kind: "verification_step_completed", warningSigns, unresolved: false, label: "Checked another way: the real person says they did not send this", detail: (denied ? `You checked: ${methodById(denied.method)?.label}.` : `${rDenied!.g.contactName} reports: ${methodById(rDenied!.r.method)?.label}. The app cannot check that itself.`) + note };
    }
    const m = mine[0];
    const t = theirs[0];
    return { kind: "verification_step_completed", warningSigns, unresolved: false, label: "Checked another way: the real person confirmed it", detail: (m ? `You checked: ${methodById(m.method)?.label}.` : `${t!.g.contactName} reports: ${methodById(t!.r.method)?.label}. The app cannot check that itself.`) + note };
  }
  const waiting = c.grants.find((g) => g.status === "active" && now <= g.expiresAt && g.replies.length === 0);
  if (waiting) return { kind: "pending", warningSigns, unresolved: true, label: `Waiting for ${waiting.contactName}`, detail: "Nobody has finished a check yet." };
  if (c.assessment.outcome === "indicators_found") return { kind: "indicators_found", warningSigns, unresolved: true, label: "Warning signs found", detail: "Nobody has checked this another way yet." };
  return {
    kind: "not_verified", warningSigns, unresolved: true,
    label: c.assessment.outcome === "cannot_assess" ? "We can't tell from the message alone" : "Not checked yet",
    detail: c.assessment.outcome === "cannot_assess" ? "This is not an all-clear." : "No warning signs in the words is not a check."
  };
}

export function deliveryLabel(g: Grant, now: number): string {
  if (g.status === "revoked") return "Stopped by you. Copies already sent cannot be taken back.";
  if (g.replies.length) return `Reply received (version ${g.replies[g.replies.length - 1]!.version}).`;
  if (now > g.expiresAt) return "Expired. No reply came.";
  if (now - g.createdAt > NO_RESPONSE_AFTER_MS) return `No reply after ${Math.floor((now - g.createdAt) / 3600_000)} hours.`;
  if (g.markedSentAt) return "You said you sent it. We cannot see whether it arrived.";
  return "Created. Not delivered until you send it yourself.";
}

export const NO_RESPONSE_GUIDANCE = [
  "Try the person another way, such as a phone call.",
  "Ask someone else you trust to look at it.",
  "Do not act on the message while you wait.",
  "ScamCircle cannot contact anyone for you and is not a monitored or emergency service. If you are in danger, call your local emergency number. If money has already gone, contact your bank straight away using a number you already trust."
];

// ---- sharing -------------------------------------------------------------------------------

/** Exactly what will be shared. The sharing function uses the same call, so preview and content cannot differ. */
export function sharedContent(c: CaseRecord, ranges: Range[]): string { return applyRedactions(c.text, ranges); }

const clean = (t: string) => t.replace(/[\p{Cc}‪-‮⁦-⁩​-‏﻿]/gu, (ch) => (ch === "\n" || ch === "\t" ? ch : ""));

export function prepareShare(state: DeviceState, caseId: string, contactId: string, opts: { ranges: Range[]; note?: string; includeLabels?: boolean; ttlMs: number }, now: number): Res<{ message: string; grantId: string; sharedText: string }> {
  const s = clone(state);
  const c = findCase(s, caseId);
  if (!c) return fail("unknown_case", "That message is not on this phone.");
  const contact = findContact(s, contactId);
  if (!contact) return fail("unknown_contact", "Choose someone from your trusted people.");
  if (contact.keyChange) return fail("key_change", `${contact.name}'s code changed. Check them again before sharing.`);
  if (contact.status !== "verified") return fail("not_verified", `You have not checked ${contact.name}'s words yet, so nothing can be shared with them.`);
  if (!isUsablePublicKey(contact.pk)) return fail("bad_key", "That contact has an unusable key.");
  if (!(opts.ttlMs >= MIN_TTL_MS && opts.ttlMs <= MAX_TTL_MS)) return fail("bad_expiry", "Choose how long they can use this.");
  const text = clean(sharedContent(c, opts.ranges));
  if (text.trim().length === 0) return fail("empty", "Nothing is left to share after hiding.");
  if (text.length > MAX_SHARED_CHARS) return fail("too_long", "That is too long to share. Hide or cut parts of it.");
  const note = cleanDisplayText(opts.note ?? "", 500);
  const labels = opts.includeLabels ? [...new Set(c.assessment.indicators.filter((i) => i.strength !== "context").map((i) => i.label))].slice(0, 20) : [];
  const grantId = randomHex(16);
  const expiresAt = now + opts.ttlMs;
  const sealed = sealMessage({ type: "share", senderSk: s.identity.sk, senderPk: s.identity.pk, recipientPk: contact.pk, grant: grantId, created: now, exp: expiresAt, payload: { text, note, labels, ownerName: s.identity.name } });
  if (sealed.text.length > MAX_MESSAGE_CHARS * 2) return fail("too_long", "That is too long to share. Hide or cut parts of it.");
  c.grants.push({ id: grantId, contactPk: contact.pk, contactName: contact.name, createdAt: now, expiresAt, status: "active", sharedText: text, note, labels, replies: [] });
  return { ok: true, state: s, message: sealed.text, grantId, sharedText: text };
}

export function markSent(state: DeviceState, caseId: string, grantId: string, now: number): DeviceState {
  const s = clone(state);
  const g = findCase(s, caseId)?.grants.find((x) => x.id === grantId);
  if (g && g.status === "active") g.markedSentAt = now;
  return s;
}

function sealRevoke(s: DeviceState, toPk: string, grantId: string, now: number, exp: number): string {
  return sealMessage({ type: "revoke", senderSk: s.identity.sk, senderPk: s.identity.pk, recipientPk: toPk, grant: grantId, created: now, exp, payload: {} }).text;
}

/** Stops future use in this app. It cannot recall anything already seen, copied or screenshotted. */
export function revokeGrant(state: DeviceState, caseId: string, grantId: string, now: number): Res<{ notice: string }> {
  const s = clone(state);
  const g = findCase(s, caseId)?.grants.find((x) => x.id === grantId);
  if (!g) return fail("unknown_grant", "That request was not found.");
  g.status = "revoked";
  g.revokedAt = now;
  return { ok: true, state: s, notice: sealRevoke(s, g.contactPk, g.id, now, g.expiresAt) };
}

// ---- receiving -----------------------------------------------------------------------------

const MethodIds = VERIFICATION_METHODS.map((m) => m.id) as [string, ...string[]];
const OutcomeIds = STEP_OUTCOMES.map((o) => o.id) as [StepOutcome, ...StepOutcome[]];
const SharePayload = z.object({ text: z.string().min(1).max(MAX_SHARED_CHARS), note: z.string().max(500), labels: z.array(z.string().max(80)).max(20), ownerName: z.string().max(80) }).strict();
const ReplyPayload = z.object({ version: z.number().int().min(1).max(1000), method: z.enum(MethodIds), outcome: z.enum(OutcomeIds), findings: z.string().min(1).max(2000), checkedAt: z.number().int(), respondedAt: z.number().int() }).strict();
const RevokePayload = z.object({}).strict();

export function classifyReply(method: string, outcome: StepOutcome): ReplyClass {
  if (method === "just_looked_at_message" || method === "thumbs_up_only") return "opinion_only";
  return stepCompletes(method, outcome) ? "verification_step_completed" : "not_verified";
}

export type Imported = { kind: "share"; grantId: string } | { kind: "reply"; grantId: string; version: number; cls: ReplyClass } | { kind: "revoke"; grantId: string };

export function importMessage(state: DeviceState, raw: string, now: number): Res<{ imported: Imported }> {
  const p = parseWire(raw);
  if (!p.ok) return fail("invalid", p.message);
  const w = p.wire;
  if (w.to !== state.identity.pk) return fail("wrong_recipient", "This message was sealed for someone else, so this phone cannot open it.");
  if (state.seen.includes(w.id)) return fail("replay", "This exact message was already imported. It was ignored.");
  const sender = contactByPk(state, w.from);
  if (!sender) return fail("unknown_sender", `This is from someone who is not in your trusted people (their words: ${fingerprintText(w.from)}). Ask them for their contact code and check them first.`);
  if (sender.status !== "verified" || sender.keyChange) return fail("sender_not_verified", `${sender.name} is not checked yet, so their messages are not accepted.`);
  if (w.exp !== null && now > w.exp) return fail("expired", "This message has expired and was not opened.");
  if (w.created > now + CLOCK_SKEW_MS) return fail("from_future", "This message is dated in the future. Check the clock on both phones.");
  const body = openMessage(w, state.identity.sk);
  if (body === null) return fail("cannot_open", "This message could not be opened. It may be damaged, changed on the way, or not made for this phone.");
  const s = clone(state);
  s.seen = [...s.seen, w.id].slice(-500);

  if (w.t === "share") {
    const r = SharePayload.safeParse(body);
    if (!r.success) return fail("bad_payload", "The message content is not in the expected form.");
    if (s.inbox.some((i) => i.grantId === w.grant) || s.tombstones.some((t) => t.kind === "inbox" && t.id === w.grant)) return fail("duplicate", "You already have this request.");
    s.inbox.unshift({ grantId: w.grant, ownerPk: w.from, ownerName: sender.name, receivedAt: now, expiresAt: w.exp ?? now + MAX_TTL_MS, text: clean(r.data.text), note: r.data.note, labels: r.data.labels, status: "open", replies: [] });
    return { ok: true, state: s, imported: { kind: "share", grantId: w.grant } };
  }
  if (w.t === "revoke") {
    if (!RevokePayload.safeParse(body).success) return fail("bad_payload", "The message content is not in the expected form.");
    const it = s.inbox.find((i) => i.grantId === w.grant && i.ownerPk === w.from);
    if (!it) return fail("unknown_grant", "No matching request on this phone.");
    it.status = "revoked";
    it.text = "";
    it.note = "";
    it.labels = [];
    return { ok: true, state: s, imported: { kind: "revoke", grantId: w.grant } };
  }
  const r = ReplyPayload.safeParse(body);
  if (!r.success) return fail("bad_payload", "The message content is not in the expected form.");
  const cs = s.cases.find((c) => c.grants.some((g) => g.id === w.grant));
  const g = cs?.grants.find((x) => x.id === w.grant);
  if (!cs || !g) return fail("unknown_grant", "This reply does not match any request you made.");
  if (g.contactPk !== w.from) return fail("not_addressee", "This reply is from someone you did not ask.");
  if (g.status === "revoked") return fail("revoked", "You stopped this request, so the reply was ignored.");
  if (now > g.expiresAt) return fail("expired", "The request had expired, so the reply was ignored.");
  const top = g.replies.reduce((m, x) => Math.max(m, x.version), 0);
  if (r.data.version <= top) return fail("stale_version", "This is an older or repeated version of a reply you already have.");
  const cls = classifyReply(r.data.method, r.data.outcome);
  g.replies.push({ ...r.data, receivedAt: now, cls });
  return { ok: true, state: s, imported: { kind: "reply", grantId: w.grant, version: r.data.version, cls } };
}

export function respond(state: DeviceState, grantId: string, input: { method: string; outcome: StepOutcome; findings: string; checkedAt: number }, now: number): Res<{ message: string; version: number; cls: ReplyClass }> {
  const s = clone(state);
  const it = s.inbox.find((i) => i.grantId === grantId);
  if (!it) return fail("unknown_grant", "That request is not on this phone.");
  if (it.status === "revoked") return fail("revoked", "The sender stopped this request.");
  if (now > it.expiresAt) return fail("expired", "This request has expired.");
  if (!methodById(input.method)) return fail("bad_method", "Choose how you checked.");
  if (!STEP_OUTCOMES.some((o) => o.id === input.outcome)) return fail("bad_outcome", "Choose what happened.");
  const findings = cleanDisplayText(input.findings, 2000);
  if (!findings) return fail("empty", "Write what you found. A thumbs-up on its own is not a check.");
  const version = it.replies.reduce((m, x) => Math.max(m, x.version), 0) + 1;
  const payload = { version, method: input.method, outcome: input.outcome, findings, checkedAt: Math.min(input.checkedAt, now), respondedAt: now };
  const sealed = sealMessage({ type: "reply", senderSk: s.identity.sk, senderPk: s.identity.pk, recipientPk: it.ownerPk, grant: grantId, created: now, exp: it.expiresAt, payload });
  it.replies.push(payload as MyReply);
  return { ok: true, state: s, message: sealed.text, version, cls: classifyReply(input.method, input.outcome) };
}

// ---- tombstones / restore ------------------------------------------------------------------

export function applyTombstones(state: DeviceState): DeviceState {
  const s = clone(state);
  const dead = (k: Tombstone["kind"], id: string) => s.tombstones.some((t) => t.kind === k && t.id === id);
  s.cases = s.cases.filter((c) => !dead("case", c.id));
  s.inbox = s.inbox.filter((i) => !dead("inbox", i.grantId));
  s.contacts = s.contacts.filter((c) => !dead("contact", c.pk));
  return s;
}

/** Restoring an older backup must not bring back anything deleted since. Tombstones from both sides apply. */
export function mergeRestore(current: DeviceState | null, backup: DeviceState): DeviceState {
  const b = clone(backup);
  if (current) {
    const key = (t: Tombstone) => `${t.kind}:${t.id}`;
    const have = new Set(b.tombstones.map(key));
    for (const t of current.tombstones) if (!have.has(key(t))) b.tombstones.push(t);
    b.seen = [...new Set([...b.seen, ...current.seen])].slice(-500);
  }
  return applyTombstones(b);
}

/** Demo only: two devices on one phone are introduced to each other. Marked as demo so it can never look like a real check. */
export function connectDemo(me: DeviceState, demo: DeviceState, now: number): { me: DeviceState; demo: DeviceState } {
  const a = clone(me);
  const b = clone(demo);
  if (!contactByPk(a, b.identity.pk)) a.contacts.push({ id: b.identity.pk.slice(0, 16), name: b.identity.name, pk: b.identity.pk, kind: "demo", status: "verified", addedAt: now, verifiedAt: now });
  if (!contactByPk(b, a.identity.pk)) b.contacts.push({ id: a.identity.pk.slice(0, 16), name: a.identity.name, pk: a.identity.pk, kind: "demo", status: "verified", addedAt: now, verifiedAt: now });
  return { me: a, demo: b };
}
