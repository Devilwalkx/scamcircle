import { describe, expect, it } from "vitest";
import { applyRedactions, rangesForText, redactForLog, suggestRedactions, hasJpegMetadata, stripJpegMetadata } from "../src/index.js";
import { MARK } from "./helpers.js";

describe("redaction", () => {
  const t = "Call 07700 900123 or mail bob@example.com. Account 12345678 sort 11-22-33.";
  it("applies exactly the marked ranges, merges overlaps, clamps out-of-range", () => {
    expect(applyRedactions("abcdef", [{ start: 1, end: 3 }, { start: 2, end: 4 }])).toBe("a[hidden]ef");
    expect(applyRedactions("abc", [{ start: -5, end: 99 }])).toBe("[hidden]");
    expect(applyRedactions("abc", [{ start: 2, end: 2 }])).toBe("abc");
  });
  it("hidden text is gone from the result", () => {
    const out = applyRedactions(t, rangesForText(t, "bob@example.com"));
    expect(out).not.toContain("bob@example.com");
    expect(out).toContain("07700 900123");
  });
  it("suggests phones, emails, bank details and postcodes but never applies them itself", () => {
    const labels = suggestRedactions(t + " SW1A 1AA").map((x) => x.label);
    expect(labels).toEqual(expect.arrayContaining(["phone number", "email address", "bank detail", "postcode"]));
    expect(applyRedactions(t, [])).toBe(t);
  });
  it("needles shorter than 2 characters are ignored", () => {
    expect(rangesForText("aaa", "a")).toEqual([]);
  });
});

describe("log redaction", () => {
  it("scrubs content-like keys and string patterns", () => {
    const out = JSON.stringify(redactForLog({ text: MARK, count: 3, nested: { fingerprint: "x", note: "call +44 7700 900123 at https://x.example/a or a@b.co" }, other: "mail a@b.co or https://x.example/a" }));
    expect(out).not.toContain(MARK);
    expect(out).not.toMatch(/7700|a@b\.co|x\.example/);
    expect(out).toContain('"count":3');
  });
});

describe("screenshot metadata", () => {
  const jpeg = (extra: number[]) => Uint8Array.from([0xff, 0xd8, ...extra, 0xff, 0xda, 0, 2, 1, 2, 3, 0xff, 0xd9]);
  const exif = [0xff, 0xe1, 0, 6, 69, 120, 105, 102];
  it("strips EXIF/COM segments and refuses non-JPEG", () => {
    const j = jpeg(exif);
    expect(hasJpegMetadata(j)).toBe(true);
    expect(hasJpegMetadata(stripJpegMetadata(j))).toBe(false);
    expect(() => stripJpegMetadata(Uint8Array.from([1, 2, 3, 4]))).toThrow();
  });
});
