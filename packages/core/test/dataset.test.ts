import { describe, expect, it } from "vitest";
import { DATASET, assess, evaluate, heldOutSet, tuningSet } from "../src/index.js";

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
  it("held-out set: results are recorded exactly, so any change is noticed and the docs must be updated", () => {
    const r = evaluate(heldOutSet());
    // Known limits, listed on purpose. A vague opener with no ask, a bank message that only says 'call us',
    // a threat without the word pattern we match, switched-bank wording, a diacritic lookalike domain, a job fee.
    expect(r.misses).toEqual(["H03", "H04", "H05", "H07", "H11", "H21"]);
    // Known false alarms: a printer manual that says 'ignore previous instructions', and a real family 'urgent loan' request.
    expect(r.alarms).toEqual(["HL08", "HL13"]);
    expect(r.overall.n).toBe(heldOutSet().length);
  });
  it("non-English and unreadable scams are 'cannot assess', never 'no warning signs'", () => {
    for (const d of DATASET.filter((x) => ["es", "de", "hi"].includes(x.language) && x.scenario === "non_english")) {
      expect(assess(d.text).outcome, d.id).toBe("cannot_assess");
    }
    expect(assess(DATASET.find((d) => d.id === "H19")!.text).outcome).toBe("cannot_assess");
  });
});
