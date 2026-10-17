import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

export const MARK = "Zebra-Quokka-7f3a2c91";
export const SCAM = `Hi Mum, my phone broke so this is my new number. Can you send £480 today? Don't tell Dad. Call 07700 900123. ${MARK}`;
export const APP_ID = "app.devilwalkx.scamcircle";

export const btn = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
export const tab = (page: Page, name: string) => page.getByRole("tab", { name: new RegExp(`^${name}`) });

/** Opens the app and proves the page is ScamCircle (and not another app's server on the same port). */
export async function open(page: Page, query = "") {
  await page.goto("/" + query);
  await expect(page.locator('meta[name="application-id"]')).toHaveAttribute("content", APP_ID);
  await expect(btn(page, "Check a message")).toBeVisible();
}

/** A modal left open blocks later clicks, so close any dialog first. */
export async function closeDialogs(page: Page) {
  for (const n of ["No, keep it", "No, keep my data", "Go back", "No"]) {
    const b = page.getByRole("button", { name: n, exact: true });
    if (await b.isVisible().catch(() => false)) await b.click();
  }
}

export async function home(page: Page) {
  await closeDialogs(page);
  await tab(page, "Check").click();
  await expect(btn(page, "Check a message")).toBeVisible();
}

export async function checkMessage(page: Page, text: string) {
  await home(page);
  await btn(page, "Check a message").click();
  await page.getByLabel("The message", { exact: true }).fill(text);
  await btn(page, "Check this message").click();
  await expect(page.getByRole("heading", { name: "What we found", exact: true })).toBeVisible();
}

export async function settings(page: Page) {
  await closeDialogs(page);
  await btn(page, "Settings").click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true }).first()).toBeVisible();
}

export async function axe(page: Page, where: string) {
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(res.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`), `axe on ${where}`).toEqual([]);
}

let shotN = 0;
export async function shot(page: Page, name: string, info: { project: { name: string } }) {
  const dir = process.env.SHOTS;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${info.project.name}-${String(++shotN).padStart(2, "0")}-${name}.png`, fullPage: false });
}

/** Layout audit: text inside its button, no overlapping interactive elements, no horizontal scroll, nothing truncated, 48 dp targets. */
export async function auditLayout(page: Page, where: string) {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth - doc.clientWidth > 1) out.push(`horizontal scroll ${doc.scrollWidth - doc.clientWidth}px`);
    const sel = '[role="button"],[role="radio"],[role="checkbox"],[role="tab"],input,textarea,a[href]';
    const modal = document.querySelector('[aria-modal="true"]');
    const scope: ParentNode = modal ?? document;
    // Rectangle of an element after clipping by scrolling/overflow ancestors (content scrolled out of view is not "overlapping" anything).
    const clipped = (e: HTMLElement) => {
      let r = e.getBoundingClientRect();
      let a: HTMLElement | null = e.parentElement;
      while (a && a !== document.body) {
        const cs = getComputedStyle(a);
        if (/(auto|scroll|hidden|clip)/.test(cs.overflow + cs.overflowY + cs.overflowX)) {
          const b = a.getBoundingClientRect();
          r = new DOMRect(Math.max(r.left, b.left), Math.max(r.top, b.top), Math.max(0, Math.min(r.right, b.right) - Math.max(r.left, b.left)), Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top)));
        }
        a = a.parentElement;
      }
      return r;
    };
    const els = [...scope.querySelectorAll<HTMLElement>(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const label = (e: HTMLElement) => (e.getAttribute("aria-label") || e.innerText || e.tagName).slice(0, 40);
    for (const e of els) {
      const r = e.getBoundingClientRect();
      if (r.height < 48 - 0.5) out.push(`"${label(e)}" is only ${Math.round(r.height)}px tall`);
      if (r.width < 44 - 0.5 && e.getAttribute("role") !== "checkbox") out.push(`"${label(e)}" is only ${Math.round(r.width)}px wide`);
      if (r.right > window.innerWidth + 1 || r.left < -1) out.push(`"${label(e)}" sticks out of the screen`);
      const role = e.getAttribute("role");
      if (role === "button" || role === "radio" || role === "checkbox" || role === "tab") {
        const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
          if (!n.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const q of range.getClientRects()) {
            if (q.left < r.left - 1 || q.right > r.right + 1 || q.top < r.top - 1 || q.bottom > r.bottom + 1) out.push(`text of "${label(e)}" spills outside its button`);
          }
        }
      }
    }
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i]!, b = els[j]!;
      if (a.contains(b) || b.contains(a)) continue;
      const x = clipped(a), y = clipped(b);
      const w = Math.min(x.right, y.right) - Math.max(x.left, y.left);
      const h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
      if (w > 1 && h > 1) out.push(`"${label(a)}" overlaps "${label(b)}"`);
    }
    return [...new Set(out)];
  });
  expect(problems, `layout problems on ${where}`).toEqual([]);
}

