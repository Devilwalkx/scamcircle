import { describe, expect, it } from "vitest";
import { DEMO_MESSAGE, VaultService, caseOutcome, deliveryLabel, loadSyntheticExample, assess, findCase } from "../src/index.js";
import { MemKV, MemKeys, NOW } from "./helpers.js";

describe("synthetic example", () => {
  it("shows new-number impersonation, a previously trusted callback route, selected sharing and an unresolved outcome", async () => {
    const svc = new VaultService(new MemKeys(), new MemKV());
    const root = await svc.create("You", NOW);
    const d = loadSyntheticExample(root, NOW);
    const c = findCase(d.root.me, d.caseId)!;
    // 1 new-number impersonation, flagged from the message alone
    expect(assess(DEMO_MESSAGE).outcome).toBe("indicators_found");
    expect(c.assessment.indicators.map((i) => i.id)).toEqual(expect.arrayContaining(["new_number", "payment_request", "secrecy"]));
    // 2 previously trusted callback path: added long before the message; the attempt could not reach anyone
    const route = d.root.me.routes[0]!;
    expect(route.addedAt).toBeLessThan(c.createdAt - 300 * 86400_000);
    expect(c.steps[0]).toMatchObject({ method: "call_saved_contact", outcome: "could_not_reach", routeId: route.id, completes: false });
    // 3 selected-reviewer sharing with redaction and a real encrypted round trip
    const g = c.grants[0]!;
    expect(g.contactName).toMatch(/Demo helper/);
    expect(g.sharedText).not.toContain("12345678");
    expect(g.sharedText).not.toContain("11-22-33");
    expect(d.root.demo!.inbox[0]!.text).toBe(g.sharedText);
    expect(g.replies).toHaveLength(1);
    // 4 unresolved outcome
    const out = caseOutcome(c, NOW + 200_000);
    expect(out.unresolved).toBe(true);
    expect(out.kind).toBe("indicators_found");
    expect(deliveryLabel(g, NOW + 200_000)).toMatch(/Reply received/);
    expect(d.steps).toHaveLength(4);
    // persists encrypted
    await svc.save(d.root);
    expect((await svc.load())!.me.cases[0]!.title).toMatch(/Example/);
  });
  it("can be loaded twice without duplicating the helper", async () => {
    const svc = new VaultService(new MemKeys(), new MemKV());
    const root = await svc.create("You", NOW);
    const once = loadSyntheticExample(root, NOW);
    const twice = loadSyntheticExample(once.root, NOW + 1000);
    expect(twice.root.me.contacts.filter((c) => c.kind === "demo")).toHaveLength(1);
    expect(twice.root.me.cases).toHaveLength(2);
  });
});
