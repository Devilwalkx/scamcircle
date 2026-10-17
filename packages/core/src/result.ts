import type { Assessment, Indicator } from "./indicators.js";
import { suggestRoute } from "./route.js";
import { caseOutcome, type CaseRecord } from "./device.js";

/**
 * The result screen is built from four separate things, never blended into one verdict:
 *  1. what was FOUND in the text,
 *  2. what could NOT be checked,
 *  3. the status of who really sent it (always "not verified" unless the person checked another way),
 *  4. the next step that CAN settle it: an independent check.
 * No field says or implies that a message is safe, genuine or fine to pay.
 */
export interface ResultView {
  found: { heading: string; items: Array<{ label: string; explanation: string; strength: Indicator["strength"] }>; emptyNote: string };
  notChecked: { heading: string; items: string[] };
  identity: { heading: string; status: "not_verified" | "checked_by_you"; statusText: string; detail: string };
  next: { heading: string; headline: string; steps: string[]; lookUp: string; avoid: string[] };
  /** One sentence for the top of the screen. It states what was and was not done; it is not a verdict. */
  summary: string;
  inconclusive: boolean;
}

export const LOOK_UP_YOURSELF =
  "If you need a phone number or website for them, find it yourself from an official source: the number on the back of your card, on a past bill or letter, or a website address you type in yourself. Do not use a number or link from this message, and do not trust a search advert.";

const ALWAYS_NOT_CHECKED = [
  "Who really sent this. A message cannot prove who wrote it.",
  "Whether anything it says is true (a parcel, an account problem, an emergency)."
];

export function describeResult(c: Pick<CaseRecord, "assessment" | "steps" | "grants">, now: number): ResultView {
  const a: Assessment = c.assessment;
  const signs = a.indicators.filter((i) => i.strength !== "context");
  const inconclusive = a.outcome === "cannot_assess";
  const route = suggestRoute(a);
  const outcome = caseOutcome(c as CaseRecord, now);
  const checked = outcome.kind === "verification_step_completed";

  const notChecked = [...ALWAYS_NOT_CHECKED];
  for (const m of a.missing) if (!notChecked.includes(m) && m !== "Who really sent this has not been checked.") notChecked.push(m);
  if (inconclusive) notChecked.unshift(a.headline);
  notChecked.push("This app reads English wording only, looks for known warning signs, and never opens links or reads pictures.");

  const summary = inconclusive
    ? "We could not read enough of this message to look for warning signs. That tells you nothing either way."
    : signs.length
      ? `We found ${signs.length} warning sign${signs.length === 1 ? "" : "s"} in the words. Who sent it is still not verified.`
      : "We found no warning signs in the words. That is not a check: who sent it is still not verified.";

  return {
    found: {
      heading: "What we found in the words",
      items: signs.map((i) => ({ label: i.label, explanation: i.explanation, strength: i.strength })),
      emptyNote: inconclusive ? "Nothing could be read here." : "No known warning sign matched. Scams that avoid these words would not be noticed."
    },
    notChecked: { heading: "What we could not check", items: notChecked },
    identity: checked
      ? { heading: "Who sent it", status: "checked_by_you", statusText: "Checked by you another way", detail: `${outcome.label}. ${outcome.detail} This app cannot confirm that itself.` }
      : { heading: "Who sent it", status: "not_verified", statusText: "Not verified", detail: "Nobody has checked who sent this another way yet." },
    next: { heading: "Settle it by checking another way", headline: route.headline, steps: route.steps, lookUp: LOOK_UP_YOURSELF, avoid: route.avoid },
    summary,
    inconclusive
  };
}

/**
 * The plain text a person can send through their own messaging app (the simple, voluntary way to ask someone).
 * It holds only what the person chose to include: the text with hidden parts already replaced, an optional note,
 * and optionally the NAMES of the warning signs. It is not encrypted by this app and says so to the reader.
 */
export function composeAskText(input: { shared: string; note?: string; signs?: string[] }): string {
  const lines = [
    "Can you look at this message with me? I am not sure about it.",
    "Please do not reply to it, and do not use any number or link in it.",
    "",
    `"${input.shared}"`
  ];
  if (input.note && input.note.trim()) lines.push("", `My note: ${input.note.trim()}`);
  if (input.signs && input.signs.length) lines.push("", `Warning signs ScamCircle noticed: ${input.signs.join("; ")}.`);
  lines.push("", "Please check it another way (for example by ringing the person on a number you already have) and tell me what you find.");
  return lines.join("\n");
}
