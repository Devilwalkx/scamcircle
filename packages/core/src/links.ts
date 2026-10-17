/**
 * Link analysis, as TEXT ONLY. Nothing here fetches, resolves, expands or opens a link: there is no
 * network code in this package (a test enforces it). The findings describe how the written address looks,
 * never where it leads, so "no findings" is not a statement that a link is safe.
 */

export type LinkSeverity = "strong" | "moderate" | "info";

export interface LinkFinding {
  id: string;
  severity: LinkSeverity;
  label: string;
  detail: string;
}

export interface LinkAnalysis {
  kind: "url" | "email";
  raw: string;
  start: number;
  end: number;
  host: string;
  /** Host with lookalike characters mapped to plain letters; shown so people can see what it imitates. */
  skeleton: string;
  registrable: string;
  findings: LinkFinding[];
  /** Always false. This package never fetches links. */
  fetched: false;
}

// ---- punycode (RFC 3492 decoder) ----------------------------------------------------------
const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128;
function adapt(delta: number, numPoints: number, first: boolean): number {
  delta = first ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) >> 1) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}
function digit(c: number): number {
  if (c >= 48 && c <= 57) return c - 22;
  if (c >= 65 && c <= 90) return c - 65;
  if (c >= 97 && c <= 122) return c - 97;
  return BASE;
}
export function punycodeDecode(input: string): string {
  const out: number[] = [];
  const basicEnd = input.lastIndexOf("-");
  for (let j = 0; j < Math.max(basicEnd, 0); j++) {
    if (input.charCodeAt(j) >= 128) throw new Error("bad punycode");
    out.push(input.charCodeAt(j));
  }
  let n = INITIAL_N, i = 0, bias = INITIAL_BIAS;
  for (let idx = basicEnd > 0 ? basicEnd + 1 : 0; idx < input.length; ) {
    const oldi = i;
    for (let w = 1, k = BASE; ; k += BASE) {
      if (idx >= input.length) throw new Error("bad punycode");
      const d = digit(input.charCodeAt(idx++));
      if (d >= BASE) throw new Error("bad punycode");
      i += d * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (d < t) break;
      w *= BASE - t;
    }
    bias = adapt(i - oldi, out.length + 1, oldi === 0);
    n += Math.floor(i / (out.length + 1));
    i %= out.length + 1;
    if (n > 0x10ffff) throw new Error("bad punycode");
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}

// ---- confusables (a small table of common cross-script lookalikes; not exhaustive) -------
const CONFUSABLES: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "һ": "h", "ԛ": "q", "ԝ": "w", "ӏ": "l", "к": "k", "м": "m", "н": "h", "т": "t", "в": "b",
  "ο": "o", "ν": "v", "ρ": "p", "α": "a", "ε": "e", "ι": "i", "κ": "k", "τ": "t", "υ": "u", "χ": "x", "μ": "u",
  "ı": "i", "ɡ": "g", "ɑ": "a", "ǀ": "l", "ⅼ": "l", "ⅰ": "i", "ℓ": "l", "ꓲ": "l", "０": "0", "１": "1"
};
function hasNonAscii(s: string): boolean {
  return /[^\x00-\x7f]/.test(s);
}
/** Confusable-letter mapping only (no accent folding). Used to decide whether lookalike letters are present. */
function confusableSkeleton(host: string): string {
  let out = "";
  for (const ch of host.normalize("NFKC").toLowerCase()) out += CONFUSABLES[ch] ?? ch;
  return out;
}
/** Accents are also folded ("é" to "e"), so "santandér" is compared with "santander". */
export function skeletonOf(host: string): string {
  return confusableSkeleton(host.normalize("NFD").replace(/\p{M}/gu, ""));
}
function scriptsIn(label: string): Set<string> {
  const s = new Set<string>();
  for (const ch of label) {
    if (/\p{Script=Latin}/u.test(ch)) s.add("Latin");
    else if (/\p{Script=Cyrillic}/u.test(ch)) s.add("Cyrillic");
    else if (/\p{Script=Greek}/u.test(ch)) s.add("Greek");
    else if (/\p{L}/u.test(ch)) s.add("Other");
  }
  return s;
}

// ---- brands (synthetic, deliberately small list used for lookalike checks) ----------------
interface Brand { name: string; genuine: string[]; exactOnly?: boolean }
export const BRANDS: readonly Brand[] = [
  { name: "paypal", genuine: ["paypal.com", "paypal.me"] },
  { name: "amazon", genuine: ["amazon.com", "amazon.co.uk", "amazon.de", "amazonaws.com", "amzn.to"] },
  { name: "apple", genuine: ["apple.com", "icloud.com"] },
  { name: "microsoft", genuine: ["microsoft.com", "live.com", "office.com", "outlook.com"] },
  { name: "google", genuine: ["google.com", "google.co.uk", "gmail.com", "goo.gl"] },
  { name: "netflix", genuine: ["netflix.com"] },
  { name: "barclays", genuine: ["barclays.co.uk", "barclays.com"] },
  { name: "lloyds", genuine: ["lloydsbank.com", "lloydsbank.co.uk", "lloydsbankinggroup.com"] },
  { name: "natwest", genuine: ["natwest.com"] },
  { name: "santander", genuine: ["santander.co.uk", "santander.com"] },
  { name: "monzo", genuine: ["monzo.com"] },
  { name: "revolut", genuine: ["revolut.com"] },
  { name: "halifax", genuine: ["halifax.co.uk"] },
  { name: "nationwide", genuine: ["nationwide.co.uk"] },
  { name: "royalmail", genuine: ["royalmail.com"] },
  { name: "whatsapp", genuine: ["whatsapp.com", "wa.me"] },
  { name: "facebook", genuine: ["facebook.com", "fb.com"] },
  { name: "instagram", genuine: ["instagram.com"] },
  { name: "hsbc", genuine: ["hsbc.co.uk", "hsbc.com"], exactOnly: true },
  { name: "hmrc", genuine: ["hmrc.gov.uk", "gov.uk"], exactOnly: true },
  { name: "dvla", genuine: ["dvla.gov.uk", "gov.uk"], exactOnly: true },
  { name: "dpd", genuine: ["dpd.co.uk", "dpd.com"], exactOnly: true },
  { name: "evri", genuine: ["evri.com"], exactOnly: true },
  { name: "dhl", genuine: ["dhl.com", "dhl.de", "dhl.co.uk"], exactOnly: true }
];

export const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "ow.ly", "rb.gy", "shorturl.at", "buff.ly", "tiny.cc", "s.id", "t.ly", "rebrand.ly", "v.gd", "lnkd.in", "shorte.st", "bl.ink", "short.io", "qr.ae", "gg.gg"
]);

const SUSPICIOUS_TLDS = new Set(["xyz", "top", "click", "zip", "work", "support", "loan", "icu", "cfd", "sbs", "rest", "monster", "buzz", "tk", "ml", "ga", "cf", "gq", "cam", "mov", "country", "stream", "download"]);
const SECOND_LEVEL = new Set(["co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk", "com.au", "co.nz", "co.in", "com.br"]);
const COMMON_TLDS = "com|net|org|info|biz|co\\.uk|org\\.uk|gov\\.uk|uk|io|me|app|dev|online|site|store|shop|live|link|page|club|xyz|top|click|zip|work|support|loan|icu|cfd|sbs|rest|monster|buzz|tk|ml|ga|cf|gq|cam|de|fr|es|it|nl|eu|us|ca|au|in|ru|cn|cc|ly|to|gl|gg|id|at|ink|help|services|secure|verify|bank";

export function registrableDomain(host: string): string {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  const last2 = labels.slice(-2).join(".");
  return SECOND_LEVEL.has(last2) ? labels.slice(-3).join(".") : last2;
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

/** Map digit/letter swaps and multi-letter lookalikes so "paypa1", "arnazon" and "rnicrosoft" compare to the real name. */
function normaliseLookalike(label: string): string {
  return label
    .replace(/-/g, "")
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/cl/g, "d")
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/\$/g, "s");
}

function brandFindings(host: string, skeleton: string, registrable: string): LinkFinding[] {
  const out: LinkFinding[] = [];
  const regSkeleton = registrableDomain(skeleton);
  // `registrable` is computed from the host as WRITTEN (after punycode decoding), not from the skeleton, so a
  // Cyrillic "netflix.com" is not mistaken for the real one just because it reads the same.
  for (const b of BRANDS) {
    if (b.genuine.includes(registrable)) return []; // exact real domain (or its real subdomain)
    const sub = skeleton.slice(0, Math.max(0, skeleton.length - regSkeleton.length));
    const label = regSkeleton.split(".")[0] ?? "";
    const norm = normaliseLookalike(label);
    const reasons: string[] = [];
    if (label.includes(b.name) || norm.includes(b.name)) reasons.push(`contains the name "${b.name}"`);
    else if (!b.exactOnly && b.name.length >= 5) {
      const d = editDistance(norm, b.name, 2);
      if (d <= (b.name.length >= 8 ? 2 : 1)) reasons.push(`is very close to "${b.name}"`);
    }
    if (sub && sub.split(/[.-]/).includes(b.name)) reasons.push(`has "${b.name}" only as a sub-part of someone else's domain`);
    if (b.name === "hmrc" || b.name === "dvla") {
      if (/gov-?uk|govuk/.test(label)) reasons.push("imitates a government address");
    }
    if (reasons.length) {
      out.push({
        id: "brand_lookalike",
        severity: "strong",
        label: `Address imitates ${b.name}`,
        detail: `The domain "${registrable}" ${reasons.join(" and ")}, but it is not one of that organisation's own domains in this app's small built-in list. Type the real address yourself instead of using this one.`
      });
      break;
    }
  }
  return out;
}

export function analyseHost(host: string, kind: "url" | "email", authority?: string): { skeleton: string; registrable: string; findings: LinkFinding[] } {
  const findings: LinkFinding[] = [];
  let shown = host.toLowerCase().replace(/\.$/, "");
  // Decode punycode labels so we can see the characters that would be displayed.
  let hasPuny = false;
  const decoded = shown.split(".").map((l) => {
    if (l.startsWith("xn--")) {
      hasPuny = true;
      try {
        return punycodeDecode(l.slice(4));
      } catch {
        return l;
      }
    }
    return l;
  });
  const unicodeHost = decoded.join(".");
  const skeleton = skeletonOf(unicodeHost);
  const reg = registrableDomain(shown);
  const regSkel = registrableDomain(skeleton);

  if (authority && authority.includes("@")) {
    findings.push({ id: "userinfo", severity: "strong", label: "Text before an @ in the address", detail: "In web addresses, anything before @ is not the real site; the site is what comes after. This trick is used to make a link look like a trusted name." });
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(shown) || /^\[[0-9a-f:]+\]$/.test(shown)) {
    findings.push({ id: "ip_host", severity: "strong", label: "Address is a bare number, not a name", detail: "Real organisations normally use a name. A number-only address hides who runs it." });
  }
  if (hasPuny || hasNonAscii(unicodeHost)) {
    const mixed = unicodeHost.split(".").some((l) => scriptsIn(l).size > 1);
    findings.push({
      id: hasPuny ? "punycode" : "non_ascii_host",
      severity: mixed || confusableSkeleton(unicodeHost) !== unicodeHost.toLowerCase() ? "strong" : "moderate",
      label: mixed ? "Address mixes alphabets" : "Address uses non-English letters",
      detail: `Some letters in this address come from other alphabets and can look identical to English letters. Read as plain letters it becomes "${skeleton}".`
    });
  }
  if (SHORTENERS.has(reg)) {
    findings.push({ id: "shortener", severity: "moderate", label: "Shortened link", detail: "A short link hides its real destination. This app does not open it to find out." });
  }
  findings.push(...brandFindings(shown, skeleton, registrableDomain(unicodeHost)));
  const labels = shown.split(".");
  const tld = labels[labels.length - 1] ?? "";
  if (SUSPICIOUS_TLDS.has(tld) && !findings.some((f) => f.id === "brand_lookalike")) {
    findings.push({ id: "unusual_tld", severity: "info", label: `Unusual ending ".${tld}"`, detail: "Banks and government bodies rarely use this ending. That alone proves nothing." });
  }
  if (labels.length >= 5 || (shown.replace(/xn--/g, "").match(/-/g)?.length ?? 0) >= 3) {
    findings.push({ id: "long_host", severity: "info", label: "Long or hyphen-heavy address", detail: "Many parts or hyphens can be used to bury a trusted-looking name." });
  }
  void kind;
  return { skeleton, registrable: reg, findings };
}

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'`]+/giu;
const BARE_RE = new RegExp(`(?<![@\\p{L}\\p{N}._/-])(?:[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]*[\\p{L}\\p{N}])?\\.)+(?:${COMMON_TLDS})(?![\\p{L}\\p{N}-])(?:\\/[^\\s<>"'\`]*)?`, "giu");
const EMAIL_RE = /[A-Za-z0-9._%+-]+@([\p{L}\p{N}.-]+\.[\p{L}]{2,})/gu;

function trimTrailing(raw: string): string {
  return raw.replace(/[.,;:!?)\]}>'"]+$/u, "");
}

export function extractLinks(text: string): LinkAnalysis[] {
  const found: LinkAnalysis[] = [];
  const covered: Array<[number, number]> = [];
  const overlaps = (s: number, e: number) => covered.some(([a, b]) => s < b && e > a);

  for (const m of text.matchAll(URL_RE)) {
    const raw = trimTrailing(m[0]);
    const start = m.index!;
    const end = start + raw.length;
    const afterScheme = raw.replace(/^https?:\/\//i, "");
    const authority = afterScheme.split(/[/?#]/)[0] ?? "";
    const hostPort = authority.includes("@") ? authority.slice(authority.lastIndexOf("@") + 1) : authority;
    const host = hostPort.replace(/:\d+$/, "");
    if (!host) continue;
    const a = analyseHost(host, "url", authority);
    const findings = [...a.findings];
    if (/^http:\/\//i.test(raw)) findings.push({ id: "no_tls", severity: "info", label: "Plain http link", detail: "Not encrypted in transit." });
    covered.push([start, end]);
    found.push({ kind: "url", raw, start, end, host: host.toLowerCase(), ...a, findings, fetched: false });
  }
  for (const m of text.matchAll(EMAIL_RE)) {
    const start = m.index!;
    const raw = trimTrailing(m[0]);
    const end = start + raw.length;
    if (overlaps(start, end)) continue;
    const domain = m[1]!.replace(/[.,;:!?]+$/, "");
    const a = analyseHost(domain, "email");
    covered.push([start, end]);
    found.push({ kind: "email", raw, start, end, host: domain.toLowerCase(), ...a, fetched: false });
  }
  for (const m of text.matchAll(BARE_RE)) {
    const raw = trimTrailing(m[0]);
    const start = m.index!;
    const end = start + raw.length;
    if (overlaps(start, end)) continue;
    const host = raw.split(/[/?#]/)[0]!;
    const a = analyseHost(host, "url");
    covered.push([start, end]);
    found.push({ kind: "url", raw, start, end, host: host.toLowerCase(), ...a, fetched: false });
  }
  return found.sort((x, y) => x.start - y.start);
}
