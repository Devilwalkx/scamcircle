import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

export const MARK = "Zebra-Quokka-7f3a2c91";
export const SCAM = `Hi Mum, my phone broke so this is my new number. Can you send £480 today? Don't tell Dad. Call 07700 900123. ${MARK}`;

export const btn = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });

export async function open(page: Page, query = "") {
  await page.goto("/" + query);
  await expect(page.getByText("Synthetic demonstration data", { exact: false }).first()).toBeVisible();
}

export async function checkMessage(page: Page, text: string) {
  await btn(page, "Check a message").click();
  await page.getByLabel("The message", { exact: true }).fill(text);
  await btn(page, "Next").click();
  await expect(page.getByRole("heading", { name: "What we noticed" })).toBeVisible();
}

export async function home(page: Page) {
  await btn(page, "‹ Back to home").click();
  await expect(btn(page, "Check a message")).toBeVisible();
}

export async function axe(page: Page, where: string) {
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(res.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`), `axe on ${where}`).toEqual([]);
}

/** Layout rules that must hold on every screen, at any text size. */
export async function layout(page: Page, where: string) {
  const r = await page.evaluate(() => {
    const vw = window.innerWidth;
    const sel = '[role="button"],[role="radio"],[role="checkbox"],textarea,input,a[href]';
    const els = [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== "hidden";
    });
    const problems: string[] = [];
    const rects = els.map((e) => ({ e, b: e.getBoundingClientRect(), name: (e.getAttribute("aria-label") || e.innerText || e.tagName).slice(0, 40) }));
    for (const { e, b, name } of rects) {
      if (e.tagName === "TEXTAREA" || e.tagName === "INPUT") continue;
      const range = document.createRange();
      range.selectNodeContents(e);
      for (const t of range.getClientRects()) {
        if (t.width === 0 || t.height === 0) continue;
        if (t.left < b.left - 1 || t.right > b.right + 1 || t.top < b.top - 1 || t.bottom > b.bottom + 1) problems.push(`text overflows "${name}"`);
      }
      if (b.height < 44) problems.push(`"${name}" is only ${Math.round(b.height)}px tall`);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!.b, c = rects[j]!.b;
        const w = Math.min(a.right, c.right) - Math.max(a.left, c.left);
        const h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        if (w > 1 && h > 1) problems.push(`"${rects[i]!.name}" overlaps "${rects[j]!.name}"`);
      }
    }
    // A single word must fit its box without being broken in the middle (browsers would otherwise split "ScamCircle" as "ScamCircl / e").
    const broken = new Set<string>();
    for (const e of document.querySelectorAll<HTMLElement>("body *")) {
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0);
      if (!own || e.tagName === "TEXTAREA" || e.tagName === "INPUT") continue;
      const prev = [e.style.overflowWrap, e.style.wordBreak, e.style.whiteSpace];
      e.style.overflowWrap = "normal";
      e.style.wordBreak = "normal";
      const over = e.scrollWidth > e.clientWidth + 1;
      [e.style.overflowWrap, e.style.wordBreak, e.style.whiteSpace] = prev;
      if (over) broken.add((e.innerText || "").slice(0, 30));
    }
    for (const t of broken) problems.push(`a word is too long for its box: "${t}"`);
    let wide = 0;
    for (const e of document.querySelectorAll<HTMLElement>("body *")) {
      const b = e.getBoundingClientRect();
      if (b.width > 0 && b.right > vw + 1) wide++;
    }
    if (wide) problems.push(`${wide} elements extend past the right edge`);
    if (document.documentElement.scrollWidth - document.documentElement.clientWidth > 1) problems.push("page scrolls sideways");
    return problems;
  });
  expect(r, `layout on ${where}`).toEqual([]);
}

let shotN = 0;
export async function shot(page: Page, name: string, info: { project: { name: string } }) {
  const dir = process.env.SHOTS;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${info.project.name}-${String(++shotN).padStart(2, "0")}-${name}.png`, fullPage: false });
}
