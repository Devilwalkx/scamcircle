# ScamCircle status

Synthetic demonstration build. Last updated by the build agent. Sections: implemented / tested / simulated / externally reviewed / blocked. Honest, not a claim of readiness.

## Implemented
- Local-first case vault app (Expo, Android + web export): Home with four big buttons, 3-step check, result-first screen, trusted people with word check, redacted sharing, replies, stop codes, settings, recovery, backup, erase, demo options, in-app text size.
- Core (pure TypeScript): indicator engine and link analysis, verification-method catalogue, redaction helpers, X25519 identity + sealed-box messages, device state machine, vault service (encryption at rest, recovery, backup/restore, tombstones), synthetic dataset and evaluation, demo story.
- Android manifest: no active permissions (INTERNET and others blocked), verified with `expo prebuild`.
- GitHub Actions: test-and-web, android-apk, publish-release (release `latest-test-build`, asset `ScamCircle-test.apk`).

## Tested
- Unit: 85 vitest tests in 8 files (`npm test`).
- E2E: 24 Playwright tests x 3 viewports (Pixel 7, 390 px, 320 px) = 72 runs, all passing locally on the final code. CI results are in the next section.
- Mutation checks done by hand this build (safeguard removed, tests failed, then restored):
  1. allow sharing with an unchecked contact -> `unverified contacts cannot receive cases` failed
  2. drop replay protection -> 2 tests failed
  3. treat message-supplied routes as independent -> 2 tests failed
  4. key change no longer demotes the contact -> 1 test failed
  5. (UI) fixed button height + one-line text -> the large-text overlap test failed on Home
  6. (UI) remove safe-area edges -> simulated-insets test failed (`Received 16`, needs >= 44)
- **CI flake found and fixed (again):** CI run 3 on `main` failed one e2e test because it asserted that the short digit string `07700` is absent from random ciphertext hex, which can occur by chance. Same class of mistake as in the sibling app. Short digit-only needles were replaced with long or non-hex ones in e2e and unit tests.
- Bugs found by tests and fixed: erase-everything left the old state on screen (no remount); radio buttons lacked `aria-checked`; text-size buttons overflowed at 2x text; "ScamCircle" broke mid-word at 2x on 320 px (found by the new word-fit check; heading growth now capped); one long word ("organisation's") in a choice label overflowed at 2x on 320 px; a wrong e2e expectation. Chromium in the sandbox was killing runs by contacting blocked hosts; the e2e config now launches it with `--no-proxy-server` and background networking off.

## CI (GitHub Actions, workflow `build`)
- Run 39041034753 (commit 3edcdd9, branch): success.
- Run 39041112367 (commit d247fbe, main): **failed**, test-and-web only, one flaky e2e assertion (see above); android-apk passed.
- Run 39041879058 (commit bee45f6, main): **success** for test-and-web, android-apk and publish-release. Release `latest-test-build` held `ScamCircle-test.apk` (70,111,571 bytes) and `ScamCircle-web.zip` (324,946 bytes).
- Later documentation-only commits republish the release from the newer commit.

## Synthetic evaluation (NOT an accuracy figure)
Written by the builder; rules were tuned only on the "tuning" part, but one author wrote both parts so the held-out part is **not independent**. Samples are tiny. Nothing here supports a general accuracy claim.

```text
SYNTHETIC samples written by the developers. Not an accuracy figure.

== Tuning set

| Group | Samples | Scam | Legit | False reassurance | False alarm | Cannot assess |
|---|---|---|---|---|---|---|
| all | 41 | 25 | 16 | 0 | 0 | 4 |

By scenario

| Group | Samples | Scam | Legit | False reassurance | False alarm | Cannot assess |
|---|---|---|---|---|---|---|
| appointment | 1 | 0 | 1 | 0 | 0 | 0 |
| bank_code | 1 | 1 | 0 | 0 | 0 | 0 |
| bank_link | 1 | 1 | 0 | 0 | 0 | 0 |
| bank_notification | 1 | 0 | 1 | 0 | 0 | 0 |
| courier | 2 | 2 | 0 | 0 | 0 | 0 |
| delivery_notice | 1 | 0 | 1 | 0 | 0 | 0 |
| family_emergency | 1 | 1 | 0 | 0 | 0 | 0 |
| family_money_request | 1 | 0 | 1 | 0 | 0 | 0 |
| family_new_number | 2 | 2 | 0 | 0 | 0 | 0 |
| family_no_request | 2 | 0 | 2 | 0 | 0 | 0 |
| genuine_link | 1 | 0 | 1 | 0 | 0 | 0 |
| gift_cards | 1 | 1 | 0 | 0 | 0 | 0 |
| government | 1 | 1 | 0 | 0 | 0 | 0 |
| investment | 1 | 1 | 0 | 0 | 0 | 0 |
| invoice | 1 | 0 | 1 | 0 | 0 | 0 |
| legit_new_number | 1 | 0 | 1 | 0 | 0 | 0 |
| legit_urgent | 2 | 0 | 2 | 0 | 0 | 0 |
| lookalike_domain | 2 | 2 | 0 | 0 | 0 | 0 |
| mixed_language | 1 | 1 | 0 | 0 | 0 | 0 |
| non_english | 3 | 2 | 1 | 0 | 0 | 3 |
| one_time_code | 1 | 0 | 1 | 0 | 0 | 0 |
| payment_detail_change | 2 | 2 | 0 | 0 | 0 | 0 |
| police | 1 | 1 | 0 | 0 | 0 | 0 |
| prompt_injection | 2 | 2 | 0 | 0 | 0 | 0 |
| receipt | 1 | 0 | 1 | 0 | 0 | 0 |
| romance | 1 | 1 | 0 | 0 | 0 | 0 |
| short | 1 | 0 | 1 | 0 | 0 | 0 |
| tech_support | 1 | 1 | 0 | 0 | 0 | 0 |
| unicode_domain | 2 | 2 | 0 | 0 | 0 | 0 |
| unreadable | 1 | 1 | 0 | 0 | 0 | 1 |
| workplace | 1 | 0 | 1 | 0 | 0 | 0 |

By language

| Group | Samples | Scam | Legit | False reassurance | False alarm | Cannot assess |
|---|---|---|---|---|---|---|
| en | 37 | 22 | 15 | 0 | 0 | 1 |
| es | 2 | 1 | 1 | 0 | 0 | 2 |
| fr | 1 | 1 | 0 | 0 | 0 | 1 |
| mixed | 1 | 1 | 0 | 0 | 0 | 0 |

Scams with no warning signs found: none
Legitimate messages given warning signs: none

== Held-out set

| Group | Samples | Scam | Legit | False reassurance | False alarm | Cannot assess |
|---|---|---|---|---|---|---|
| all | 34 | 21 | 13 | 6 | 2 | 4 |

By scenario

| Group | Samples | Scam | Legit | False reassurance | False alarm | Cannot assess |
|---|---|---|---|---|---|---|
| adversarial_legit_wording | 1 | 0 | 1 | 0 | 1 | 0 |
| appointment | 1 | 0 | 1 | 0 | 0 | 0 |
| bank_call_us | 1 | 1 | 0 | 1 | 0 | 0 |
| bank_notification | 1 | 0 | 1 | 0 | 0 | 0 |
| courier | 1 | 1 | 0 | 0 | 0 | 0 |
| family_money_request | 3 | 0 | 3 | 0 | 1 | 0 |
| family_new_number | 2 | 2 | 0 | 0 | 0 | 0 |
| family_no_request | 1 | 0 | 1 | 0 | 0 | 0 |
| family_vague_opener | 1 | 1 | 0 | 1 | 0 | 0 |
| genuine_link | 1 | 0 | 1 | 0 | 0 | 0 |
| gift_cards | 1 | 1 | 0 | 0 | 0 | 0 |
| government | 1 | 1 | 0 | 1 | 0 | 0 |
| investment | 1 | 1 | 0 | 0 | 0 | 0 |
| job_fee | 1 | 1 | 0 | 1 | 0 | 0 |
| legit_new_number | 2 | 0 | 2 | 0 | 0 | 0 |
| legit_urgent | 2 | 0 | 2 | 0 | 0 | 0 |
| lookalike_domain | 2 | 2 | 0 | 0 | 0 | 0 |
| non_english | 3 | 2 | 1 | 0 | 0 | 3 |
| payment_detail_change | 1 | 1 | 0 | 1 | 0 | 0 |
| prompt_injection | 2 | 2 | 0 | 0 | 0 | 0 |
| romance | 1 | 1 | 0 | 0 | 0 | 0 |
| shortener | 1 | 1 | 0 | 0 | 0 | 0 |
| tech_support | 1 | 1 | 0 | 0 | 0 | 0 |
| unicode_domain | 1 | 1 | 0 | 1 | 0 | 0 |
| unreadable | 1 | 1 | 0 | 0 | 0 | 1 |

By language

| Group | Samples | Scam | Legit | False reassurance | False alarm | Cannot assess |
|---|---|---|---|---|---|---|
| de | 1 | 1 | 0 | 0 | 0 | 1 |
| en | 31 | 19 | 12 | 6 | 2 | 1 |
| fr | 1 | 0 | 1 | 0 | 0 | 1 |
| hi | 1 | 1 | 0 | 0 | 0 | 1 |

Scams with no warning signs found: H03, H04, H05, H07, H11, H21
Legitimate messages given warning signs: HL08, HL13
```

Reading it: **false reassurance** = a scam sample with no warning signs found (the app would not alarm). **False alarm** = a legitimate sample that got warning signs. **Cannot assess** = non-English, unreadable or too short, shown as "can't tell" and not counted as either.

Known held-out misses, on purpose not tuned away after seeing them: H03 (a vague opener with no request), H04 (a bank text that only says "call us"), H05 (an arrest-threat phrasing the rules do not match), H07 ("switched banks" wording), H11 (a lookalike domain made with an accented letter; the confusable table has no accent folding), H21 (a job-fee request with only one weak sign). Known held-out false alarms: HL08 (a printer manual that says "ignore previous instructions"), HL13 (a real family "lend me £50 urgently" request, flagged by design because urgency plus a money request is the family-scam shape).

## Simulated
- The "second person" is a second device state on the same phone; the crypto is real but it is not a second person or a second phone.
- Delivery: manual copy/paste. No delivery receipts exist.
- Two-phone e2e uses two isolated browser profiles, not two phones.
- Demo clock changes only this app's view of time.

## Externally reviewed
**Nothing.** No independent cryptographic, privacy, security, accessibility or legal review has taken place.

## Blocked or not built
| Item | Why |
|---|---|
| Real-phone run (install, secure storage, secure random, image picker, clipboard, share sheet) | No device available to the builder. **The APK has never been run on a phone.** |
| Competitor facts (Norton etc.), ICO / Data (Use and Access) Act 2025 guidance | Sandbox could reach only npm and GitHub; nothing was verified |
| Backend, accounts, push, delivery receipts, directory | Not built (DECISIONS D-002) |
| OCR / cloud AI | Not allowed for private content by the brief; not built |
| Task-switcher/lock-screen hiding | Not built (D-018) |
| Image crop UI | Not built; redaction works on typed text |
| App lock / PIN | Not built |
| Legal: Article 10, DPIA, lawful basis, processor terms, rights, incident process | Needs people (PRIVACY_REGISTER.md) |
| Pilot with 30 family pairs; pricing test | Needs real consenting users |
| Independent review of the sealed-box composition and the 4-word check | Needs an expert |
| Dependency audit triage (`npm audit` reports findings in Expo build tooling) | Not triaged |
| iOS build | Not set up |

## Before installing
It is a test build with made-up data, signed with the Android debug key, never run on a real phone by its builder. Do not put real private messages in it. It cannot tell you a message is safe.
