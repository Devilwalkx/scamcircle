import { describe, expect, it } from "vitest";
import { extractLinks, punycodeDecode, skeletonOf } from "../src/index.js";

const f = (t: string) => extractLinks(t).flatMap((l) => l.findings.map((x) => x.id));

describe("link analysis (text only)", () => {
  it("lookalike and brand-in-wrong-place domains", () => {
    expect(f("pay at paypa1-secure.com")).toContain("brand_lookalike");
    expect(f("https://paypal.com.verify-login.xyz/a")).toContain("brand_lookalike");
    expect(f("arnazon.com")).toContain("brand_lookalike");
    expect(f("rnicrosoft.com")).toContain("brand_lookalike");
    expect(f("hmrc-refund.com")).toContain("brand_lookalike");
    expect(f("support@barclays-help.co.uk")).toContain("brand_lookalike");
  });
  it("genuine brand domains are not flagged", () => {
    for (const t of ["https://www.paypal.com/uk", "amazon.co.uk/orders", "https://www.gov.uk/tax", "https://www.hsbc.co.uk/help", "https://photos.google.com/x"]) {
      expect(f(t).filter((x) => x === "brand_lookalike"), t).toEqual([]);
    }
  });
  it("unicode lookalike letters (Cyrillic) are detected and shown as plain letters", () => {
    const l = extractLinks("https://nеtflix.com/billing")[0]!; // Cyrillic е
    expect(l.findings.map((x) => x.id)).toEqual(expect.arrayContaining(["non_ascii_host", "brand_lookalike"]));
    expect(l.skeleton).toBe("netflix.com");
  });
  it("punycode is decoded and checked", () => {
    expect(punycodeDecode("pple-43d")).toBe("аpple");
    const l = extractLinks("http://xn--pple-43d.com/id")[0]!;
    expect(l.skeleton).toBe("apple.com");
    expect(l.findings.map((x) => x.id)).toEqual(expect.arrayContaining(["punycode"]));
  });
  it("shorteners, IP hosts, userinfo trick", () => {
    expect(f("bit.ly/3abc")).toContain("shortener");
    expect(f("http://185.23.44.9/update")).toContain("ip_host");
    expect(f("https://www.hsbc.co.uk@secure-check.net/login")).toContain("userinfo");
  });
  it("ordinary text is not mistaken for links", () => {
    expect(extractLinks("e.g. version 3.5 and hello.world, Mr. Smith said so.")).toEqual([]);
  });
  it("links are never fetched (flag is a constant false) and skeletonOf maps lookalikes", () => {
    expect(extractLinks("www.example.com")[0]!.fetched).toBe(false);
    expect(skeletonOf("раураl")).toBe("paypal");
  });
});
