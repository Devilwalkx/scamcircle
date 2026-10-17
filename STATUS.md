# ScamCircle status

Test build 0.2.0 (`app.devilwalkx.scamcircle`), Android quality pass. Sections: implemented / tested / simulated / externally reviewed / blocked. Honest, not a claim of readiness. The full pass report, with a requirement-by-requirement checklist, is docs/ANDROID_PASS_REPORT.md. CI results are listed there and are not repeated here, to avoid two sources of truth.

**Never read the evaluation numbers as protection.** Fixture performance is not proven protection. The checker misses scams (see below and docs/EVALUATION.md) and was tested only on made-up messages written by its builders.

## Implemented
- Local-first case vault app (Expo, Android + web export): Home with one big "Check a message" action, check flow, four-part result screen, trusted people with word check, text or encrypted-code sharing with redaction, replies, stop codes, settings (colours, text size, offline page, evaluation page), recovery, backup, erase, sealed drafts, demonstration tools.
- Core (pure TypeScript): indicator engine and link analysis, verification-method catalogue, redaction helpers, X25519 identity + sealed-box messages, device state machine, vault service (encryption at rest, recovery, backup/restore, tombstones), synthetic dataset and evaluation, demo story.
- Android: no permissions at all (checked on the generated manifest and on the built APK in CI); share-in for text and pictures through the Android share sheet (`expo-sharing` plugin).
- GitHub Actions: test-and-web, android-apk, publish-release (release `latest-test-build`, asset `ScamCircle-test.apk`).

## Tested
- Unit: 103 core tests plus 5 design-token tests (contrast for light and dark, 16 sp body, 14 sp minimum, 48 dp touch) (`npm test`). They check logic, wording and config; they do not show the engine catches real scams.
- E2E (browser, not Android): 33 Playwright tests x 3 viewports (Pixel 7, 390 px, 320 px) = 99 runs. Includes an axe plus layout audit of every screen at normal text, system scale 2 and dark, and worst-case text. Browser results are not Android results.
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
See docs/ANDROID_PASS_REPORT.md section 5 and 7 for run ids and each job result. Release `latest-test-build` is republished only by a successful run on `main`.

## Synthetic evaluation (NOT an accuracy figure)
Three made-up sets, all by the same author; details and method in docs/EVALUATION.md.

| Set | Role | Scams with no warning signs | Ordinary messages given warning signs |
|---|---|---|---|
| A, 41 messages | rules were written against it | 0 | 0 |
| B, 34 messages | was "held-out", then its 6 misses and 2 false alarms were analysed and rules changed, so now dev/regression only | 0 (was 6) | 1 (was 2: HL13, kept on purpose) |
| **C, 62 messages** | written **after** the fixes, **not tuned on** | **12 of 36 scams** | **3 of 26 ordinary** |

Set C misses: N03, N09, N12, N14, N21, N24, N25, N27, N28, N29, N31, N32. False alarms: NL01, NL08, NL13. These are real limits of this version and were left as they are. 6 further messages (non-English or unreadable) are "could not read enough to tell". Set C is pinned by a test, so changing rules shows up.

## Simulated
- The "second person" is a second device state on the same phone; the crypto is real but it is not a second person or a second phone.
- The "demo helper" is a second device state on the same phone, now only under Settings, Demonstration tools, labelled as a simulation.
- Delivery: manual copy/paste or the OS share sheet. No delivery receipts or reply notifications exist, and the UI says so.
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
| Picture analysis (OCR) | Not built, and the UI says pictures are not analysed. A trim-edges-and-share crop exists (stepper buttons; no covering/blur) |
| App lock / PIN | Not built |
| Legal: Article 10, DPIA, lawful basis, processor terms, rights, incident process | Needs people (PRIVACY_REGISTER.md) |
| Pilot with 30 family pairs; pricing test | Needs real consenting users |
| Independent review of the sealed-box composition and the 4-word check | Needs an expert |
| Dependency audit triage (`npm audit` reports findings in Expo build tooling) | Not triaged |
| iOS build | Not set up |

## Before installing
It is a test build with made-up data, signed with the Android debug key, never run on a real phone by its builder. Do not put real private messages in it. It cannot tell you a message is safe.
