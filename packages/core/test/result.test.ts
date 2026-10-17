import { describe, expect, it } from "vitest";
import { DATASET, HOLDOUT2, FORBIDDEN_REASSURANCE, addCase, assess, createDevice, describeResult, findCase, recordStep } from "../src/index.js";
import { NOW } from "./helpers.js";

const viewOf = (text: string) => {
  const d = createDevice("Me", NOW);
  const r = addCase(d, { text, source: "paste" }, NOW);
  if (!r.ok) throw new Error("addCase failed");
  return { d: r.state, id: r.caseId, v: describeResult(findCase(r.state, r.caseId)!, NOW) };
};

describe("result view: four separate things", () => {
  it("always has all four sections, identity is 'Not verified' and a next step that says to find the number yourself", () => {
    for (const s of [...DATASET, ...HOLDOUT2]) {
      const { v } = viewOf(s.text);
      expect(v.identity.status, s.id).toBe("not_verified");
      expect(v.identity.statusText).toBe("Not verified");
      expect(v.notChecked.items.length, s.id).toBeGreaterThan(1);
      expect(v.next.steps.length, s.id).toBeGreaterThan(0);
      expect(v.next.lookUp, s.id).toMatch(/find it yourself from an official source/);
      expect(v.next.headline, s.id).toMatch(/Do not use the phone number or link in the message/);
    }
  });
  it("no string in any section can be read as safe, genuine or fine to pay, for any sample or a very short or unreadable message", () => {
    for (const t of [...DATASET, ...HOLDOUT2].map((s) => s.text).concat(["ok", "[unreadable] [unreadable]", "Hola, todo bien"])) {
      const { v } = viewOf(t);
      const all = JSON.stringify(v);
      expect(all, t).not.toMatch(FORBIDDEN_REASSURANCE);
      expect(all, t).not.toMatch(/\b(?:genuine|safe to|is safe|looks safe|legitimate|trustworthy)\b/i);
    }
  });
  it("an inconclusive message still tells the person how to verify independently and says it is not an all-clear", () => {
    const { v } = viewOf("Hola mamá, mi teléfono se rompió. Necesito dinero urgente.");
    expect(v.inconclusive).toBe(true);
    expect(v.summary).toMatch(/tells you nothing either way/);
    expect(v.next.steps.join(" ")).toMatch(/already (?:have|had)|official/i);
  });
  it("no warning signs: says so only as 'in the words' and 'not a check'", () => {
    const { v } = viewOf("Hi love, I'm at the shops. Do you need anything? Back about five.");
    expect(v.found.items).toHaveLength(0);
    expect(v.summary).toMatch(/not a check/);
  });
  it("identity becomes 'checked by you' only after an independent check with a clear answer", () => {
    const { d, id } = viewOf("Hi Mum, new number, can you send £300 today? Don't tell Dad.");
    const bad = recordStep(d, id, { method: "called_number_in_message", outcome: "confirmed_by_real_person" }, NOW);
    expect(bad.ok && describeResult(findCase(bad.state, id)!, NOW).identity.status).toBe("not_verified");
    const good = recordStep(d, id, { method: "call_saved_contact", outcome: "denied_by_real_person" }, NOW);
    expect(good.ok && describeResult(findCase(good.state, id)!, NOW).identity.status).toBe("checked_by_you");
    void assess;
  });
});
