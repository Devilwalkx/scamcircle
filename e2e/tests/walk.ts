import { expect, type Page } from "@playwright/test";
import { SCAM, btn, checkMessage, closeDialogs, home, settings, tab } from "./helpers.js";

export type Visit = (label: string) => Promise<void>;

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

/** Visits every screen of the app, calling `visit` on each. */
export async function walk(page: Page, visit: Visit) {
  await visit("home-first-run");
  await btn(page, "Check a message").click();
  await visit("check-empty");
  // a picture: choose it, see it is "not analysed", open the crop screen
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), btn(page, "It is in a picture").click()]);
  await fc.setFiles({ name: "x.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("This picture was not analysed", { exact: true }).first()).toBeVisible();
  await visit("check-picture");
  await btn(page, "Crop it to share with someone").click();
  await expect(page.getByRole("heading", { name: "Crop a picture to share" })).toBeVisible();
  await visit("crop");
  await tab(page, "Check").click();
  await checkMessage(page, SCAM);
  await visit("result");
  await page.getByRole("button", { name: "Show the message with the warning words marked" }).click();
  await page.getByRole("button", { name: "Do not use these to check" }).click();
  await page.getByRole("button", { name: "Your checks and who you asked" }).click();
  await visit("result-open");
  await btn(page, "Delete this message").click();
  await visit("delete-confirm");
  await btn(page, "I checked it another way").click();
  await visit("record");
  await btn(page, "Back").click();
  await btn(page, "Ask someone I trust to look").click();
  await visit("share-how");
  await btn(page, "Next").click();
  await visit("share-what");
  await btn(page, "Next").click();
  await visit("share-options");
  await btn(page, "Review").click();
  await visit("share-text-confirm");
  await btn(page, "Continue").click();
  await visit("share-text-done");
  // settings and its pages
  await settings(page);
  await visit("settings");
  for (const [open, label] of [["Works without internet", "offline"], ["How well does the checker work?", "evaluation"], ["What this app cannot do", "limits"], ["Make a backup", "backup"], ["Restore a backup", "restore"]] as const) {
    await btn(page, new RegExp(`^${open.replace("?", "\\?")}`)).click();
    await visit(label);
    await btn(page, "Back").click();
  }
  await btn(page, "Erase everything").click();
  await visit("erase-confirm");
  await page.getByRole("button", { name: "Demonstration tools (not for real use)" }).click();
  await btn(page, "Open demonstration tools").click();
  await visit("demo-tools");
  await btn(page, "Add a pretend second person").click();
  // share by private code to the pretend helper
  await home(page);
  await btn(page, "Open").first().click();
  await btn(page, "Ask someone I trust to look").click();
  await page.getByRole("radio", { name: /Make a private code/ }).click();
  await btn(page, "Next").click();
  await visit("share-who");
  await page.getByRole("radio", { name: /Demo helper/ }).click();
  await btn(page, "Next").click();
  await btn(page, "Next").click();
  await visit("share-options-code");
  await btn(page, "Review").click();
  await visit("share-code-confirm");
  await btn(page, "Create the code").click();
  await visit("share-code-done");
  await btn(page, "Hand it to the demo helper now").click();
  // people and requests
  await tab(page, "People").click();
  await visit("people");
  await btn(page, "Add a person").first().click();
  await visit("people-add1");
  await btn(page, "Next: paste their code").click();
  await visit("people-add2");
  await tab(page, "People").click();
  await btn(page, /^Remove Demo helper/).click();
  await visit("remove-confirm");
  await tab(page, "Requests").click();
  await visit("requests-empty");
  // the pretend helper's side
  await settings(page);
  await page.getByRole("button", { name: "Demonstration tools (not for real use)" }).click();
  await btn(page, "Open demonstration tools").click();
  await btn(page, "Look at the app as the pretend helper").click();
  await tab(page, "Requests").click();
  await visit("requests-list");
  await btn(page, "Open").first().click();
  await visit("request-open");
  await btn(page, "Reply").click();
  await page.getByRole("radio", { name: /Asked another person/ }).click();
  await page.getByRole("radio", { name: /Unclear/ }).click();
  await page.getByLabel("What did you find?").fill("Nobody I asked has heard from them.");
  await visit("reply-form");
  await btn(page, "Review my reply").click();
  await visit("reply-confirm");
  await btn(page, "Create the reply code").click();
  await visit("reply-code");
  await closeDialogs(page);
}
