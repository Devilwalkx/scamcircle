import { expect, type Page } from "@playwright/test";
import { MARK, SCAM, btn, checkMessage, home } from "./helpers.js";

export type Visit = (label: string) => Promise<void>;

/** Visits every screen of the app, calling `visit` on each. Uses the demo helper so the share steps are reachable. */
export async function walk(page: Page, visit: Visit) {
  await visit("home-empty");
  // settings
  await btn(page, "Settings and privacy").click();
  await visit("settings");
  await btn(page, "What this app cannot do").click();
  await visit("limits");
  await btn(page, "Back to settings").click();
  await btn(page, "Make a backup").click();
  await visit("backup");
  await btn(page, "Back to settings").click();
  await btn(page, "Restore a backup").click();
  await visit("restore");
  await btn(page, "Back to settings").click();
  await btn(page, "Erase everything").click();
  await visit("erase-confirm");
  await btn(page, "Go back").click();
  await btn(page, "Demo options").click();
  await visit("demo-options");
  await btn(page, "Add a demo second person").click();
  await home(page);
  // check flow
  await btn(page, "Check a message").click();
  await visit("check-step1");
  await page.getByLabel("The message", { exact: true }).fill(SCAM);
  await btn(page, "Next").click();
  await expect(page.getByRole("heading", { name: "What we noticed" })).toBeVisible();
  await visit("result");
  await btn(page, "See what we noticed").click();
  await visit("result-detail");
  await btn(page, "Delete this message").click();
  await visit("delete-confirm");
  await btn(page, "Go back").click();
  await btn(page, "I checked it another way").click();
  await visit("record");
  await btn(page, "‹ Back to home").click();
  await btn(page, "Open").first().click();
  await btn(page, "Ask someone I trust").click();
  await visit("share-who");
  await page.getByRole("radio", { name: /Demo helper/ }).click();
  await btn(page, "Next").click();
  await visit("share-what");
  await btn(page, "Next").click();
  await visit("share-how");
  await btn(page, "Review").click();
  await visit("share-confirm");
  await btn(page, "Create the code").click();
  await visit("share-done");
  await home(page);
  // people
  await btn(page, "My trusted people").click();
  await visit("people");
  await btn(page, "Add a person").click();
  await visit("people-add1");
  await btn(page, "Next: paste their code").click();
  await visit("people-add2");
  await btn(page, "Back").click();
  await btn(page, "Back").click();
  await btn(page, "Remove Demo helper (same phone)").click();
  await visit("remove-confirm");
  await btn(page, "Go back").click();
  await home(page);
  // waiting
  await btn(page, "Messages waiting for me").click();
  await visit("waiting-empty");
  await home(page);
  expect(MARK).toBeTruthy();
}
