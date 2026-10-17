import {
  addCase, addRoute, caseOutcome, connectDemo, createDevice, findContact, importMessage, markSent, prepareShare, recordStep, respond, type DeviceState
} from "./device.js";
import type { Root } from "./service.js";
import { rangesForText } from "./redact.js";

export const SYNTHETIC_NOTICE = "Synthetic demonstration data. Nothing here is a real message, person or account.";

export const DEMO_MESSAGE = "Hi Mum, my phone fell in the sea so this is my new number. Can you send £480 to this account today? Sort code 11-22-33 account 12345678. Please don't tell Dad, I'll explain later x";
export const DEMO_REVIEWER_NAME = "Demo helper (same phone)";
const DAY = 86400_000;

export interface DemoResult { root: Root; caseId: string; steps: string[] }

/**
 * Builds the whole story using the real code paths, including the real encrypted messages:
 * a new-number message, a callback route trusted BEFORE the message, a share to a selected reviewer,
 * the reviewer's reply, and an outcome that is still unresolved.
 */
export function loadSyntheticExample(root: Root, now: number): DemoResult {
  const steps: string[] = [];
  let me: DeviceState = root.me;
  let demo: DeviceState = root.demo ?? createDevice(DEMO_REVIEWER_NAME, now);
  ({ me, demo } = connectDemo(me, demo, now));
  me = addRoute(me, "Alex's usual number (saved in my phone last year)", now - 400 * DAY);
  const route = me.routes[me.routes.length - 1]!;
  const added = addCase(me, { title: "Example: 'Alex' on a new number", text: DEMO_MESSAGE, source: "demo" }, now);
  if (!added.ok) throw new Error(added.message);
  me = added.state;
  steps.push("A message arrives from a new number claiming to be your child.");
  const rec = recordStep(me, added.caseId, { method: "call_saved_contact", outcome: "could_not_reach", routeId: route.id, note: "Rang the saved number, no answer." }, now + 60_000);
  if (!rec.ok) throw new Error(rec.message);
  me = rec.state;
  steps.push("You try the number you already trusted. Nobody answers, so nothing is checked yet.");
  const contact = me.contacts.find((c) => c.kind === "demo")!;
  const ranges = [...rangesForText(DEMO_MESSAGE, "11-22-33"), ...rangesForText(DEMO_MESSAGE, "12345678")];
  const share = prepareShare(me, added.caseId, contact.id, { ranges, note: "Can you check with Alex's sister if she has heard from Alex?", includeLabels: true, ttlMs: 24 * 3600_000 }, now + 120_000);
  if (!share.ok) throw new Error(share.message);
  me = markSent(share.state, added.caseId, share.grantId, now + 130_000);
  steps.push("You share the message with one chosen person, with the bank details hidden.");
  const got = importMessage(demo, share.message, now + 140_000);
  if (!got.ok) throw new Error(got.message);
  demo = got.state;
  const rep = respond(demo, share.grantId, { method: "asked_other_known_person", outcome: "inconclusive", findings: "I asked Sam. Sam has not heard from Alex either, so I cannot say either way.", checkedAt: now + 150_000 }, now + 160_000);
  if (!rep.ok) throw new Error(rep.message);
  demo = rep.state;
  const back = importMessage(me, rep.message, now + 170_000);
  if (!back.ok) throw new Error(back.message);
  me = back.state;
  steps.push("Your helper replies. They could not settle it, so the case stays unresolved.");
  void findContact; void caseOutcome;
  return { root: { me, demo }, caseId: added.caseId, steps };
}

export const EXAMPLE_TITLE = "Example (made-up message)";
/**
 * The first-run example: ONE made-up message added as an ordinary case marked `source: "demo"`. It adds no helper, no
 * trusted route and nothing else, so example data and a person's own data are never mixed. It can be deleted like any case.
 */
export function addExampleCase(state: DeviceState, now: number): { state: DeviceState; caseId: string } {
  const r = addCase(state, { title: EXAMPLE_TITLE, text: DEMO_MESSAGE, source: "demo" }, now);
  if (!r.ok) throw new Error(r.message);
  return { state: r.state, caseId: r.caseId };
}
