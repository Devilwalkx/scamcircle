import { describe, expect, it } from "vitest";
import { DATASET, HOLDOUT2, assess, evaluate, heldOutSet, tuningSet } from "../src/index.js";

describe("synthetic evaluation set (NOT an accuracy figure)", () => {
  it("has a tuning part and a held-out part covering the required scenarios", () => {
    expect(tuningSet().length).toBeGreaterThanOrEqual(35);
    expect(heldOutSet().length).toBeGreaterThanOrEqual(30);
    const sc = new Set(DATASET.map((d) => d.scenario));
    for (const need of ["family_new_number", "legit_urgent", "lookalike_domain", "unicode_domain", "non_english", "prompt_injection", "unreadable", "family_no_request", "payment_detail_change"]) expect(sc.has(need), need).toBe(true);
    expect(new Set(DATASET.map((d) => d.id)).size).toBe(DATASET.length);
    expect(DATASET.some((d) => /https?:|www\./.test(d.text) === false && d.scenario === "family_new_number")).toBe(true);
  });
  it("tuning set: no false reassurance and no false alarm (it was used to write the rules)", () => {
    const r = evaluate(tuningSet());
    expect(r.misses).toEqual([]);
    expect(r.alarms).toEqual([]);
  });
  it("dev/regression set B (it was the held-out set until its results were read; the rules were then changed, so it is no longer held out): results recorded exactly", () => {
    const r = evaluate(heldOutSet());
    // Before the rules were changed this set had 6 false reassurances (H03, H04, H05, H07, H11, H21) and 2 false alarms (HL08, HL13).
    // Root causes and fixes are in docs/EVALUATION.md. Those six scams and HL08 are now flagged; the original expectation listed them as misses.
    expect(r.misses).toEqual([]);
    // HL13 ("Can you lend me £50 urgently? I'll pay you back tomorrow") stays a false alarm on purpose: as text it is identical to the
    // opening of a family scam, and suppressing it would create false reassurance for H02/T01-style messages.
    expect(r.alarms).toEqual(["HL13"]);
    expect(r.overall.n).toBe(heldOutSet().length);
  });
  it("non-English and unreadable scams are 'cannot assess', never 'no warning signs'", () => {
    for (const d of DATASET.filter((x) => ["es", "de", "hi"].includes(x.language) && x.scenario === "non_english")) {
      expect(assess(d.text).outcome, d.id).toBe("cannot_assess");
    }
    expect(assess(DATASET.find((d) => d.id === "H19")!.text).outcome).toBe("cannot_assess");
  });

  it("set C (holdout-2, written after the rule changes, not tuned on): results recorded exactly, misses and false alarms included", () => {
    const r = evaluate(HOLDOUT2);
    // These are real misses of this engine version. They are listed, not hidden, and the rules were not changed in response.
    expect(r.misses).toEqual(["N03", "N09", "N12", "N14", "N21", "N24", "N25", "N27", "N28", "N29", "N31", "N32"]);
    expect(r.alarms).toEqual(["NL01", "NL08", "NL13"]);
    expect(r.overall.n).toBe(62);
    expect(new Set([...DATASET, ...HOLDOUT2].map((d) => d.id)).size).toBe(DATASET.length + HOLDOUT2.length);
    // Not-in-English and unreadable messages are still "cannot assess", never "no warning signs".
    for (const d of HOLDOUT2.filter((x) => ["NX01", "NX02", "NX03", "NX04", "NX05", "NX06"].includes(x.id))) expect(assess(d.text).outcome, d.id).toBe("cannot_assess");
  });
});
