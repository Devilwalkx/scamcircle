export interface Range { start: number; end: number }
export interface Suggestion extends Range { text: string; label: string }

export const REDACTION_MARK = "[hidden]";

/** Replace the marked ranges with a fixed mark. Ranges are clamped, sorted and merged; the result is exactly what would be shared. */
export function applyRedactions(text: string, ranges: Range[]): string {
  const rs = ranges
    .map((r) => ({ start: Math.max(0, Math.min(text.length, Math.floor(r.start))), end: Math.max(0, Math.min(text.length, Math.floor(r.end))) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const r of rs) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  let out = "";
  let pos = 0;
  for (const r of merged) {
    out += text.slice(pos, r.start) + REDACTION_MARK;
    pos = r.end;
  }
  return out + text.slice(pos);
}

/** All occurrences of what the user typed (case-insensitive). The user decides what to hide; nothing is hidden automatically. */
export function rangesForText(text: string, needle: string): Range[] {
  const n = needle.trim();
  if (n.length < 2) return [];
  const out: Range[] = [];
  const hay = text.toLowerCase();
  const nd = n.toLowerCase();
  for (let i = hay.indexOf(nd); i >= 0; i = hay.indexOf(nd, i + nd.length)) out.push({ start: i, end: i + nd.length });
  return out;
}

const PATTERNS: Array<[string, RegExp]> = [
  ["phone number", /(?<![\p{L}\p{N}])\+?\d[\d\s().-]{7,}\d(?![\p{L}\p{N}])/gu],
  ["email address", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ["bank detail", /\b\d{2}-\d{2}-\d{2}\b|\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}(?:\s?[A-Z0-9]{4}){2,7}\b/g],
  ["postcode", /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/g]
];

/** Suggestions only. The person confirms each one. Names and addresses are not detected, so they still need a manual look. */
export function suggestRedactions(text: string): Suggestion[] {
  const out: Suggestion[] = [];
  for (const [label, re] of PATTERNS) {
    for (const m of text.matchAll(re)) out.push({ start: m.index!, end: m.index! + m[0].length, text: m[0], label });
  }
  return out.sort((a, b) => a.start - b.start);
}
