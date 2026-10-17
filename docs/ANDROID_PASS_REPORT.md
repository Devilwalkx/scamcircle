# ScamCircle Android product-quality pass: report

Build 0.2.0, application id `app.devilwalkx.scamcircle`. Repo Devilwalkx/scamcircle, branch `claude/h-gm8m50` and `main`. Code under test: commit `ca0a463` (CI run 17 on main, run 16 on the branch). The only commits after it are documentation and evidence files.

**What this is not:** no physical phone was used, TalkBack was not run, no fresh user saw it, no independent person reviewed it. Android evidence is from GitHub-hosted emulators only. The checker is a word-pattern engine that misses scams (section 7). Fixture performance is not proven protection.

Status words: PASS / PARTIAL / FAIL / NOT TESTED / BLOCKED.

## 1. State table

| Area | State | Where |
|---|---|---|
| Home: one centred primary action "Check a message"; people and requests quieter | working (browser + emulator) | `apps/mobile/src/screens/Home.tsx`; e2e "Home: one clear action"; flow 01 |
| Check flow, result with four separate things (found / could not check / who sent it = Not verified / next independent check) | working | `packages/core/src/result.ts`, `Check.tsx`; core `result.test.ts`; flow 02 |
| Share-in of text from other apps (Android share sheet) | working on emulator, driven by `adb` SEND intents (cold start and app already open). Not tested from a real sender app or a physical phone | `expo-sharing` plugin; flows 09, 10 |
| Share-in of a picture | PARTIAL: the app is offered the picture and shows "Picture received / cannot read pictures", but in the emulator test the picture itself could not be opened ("could not be opened here"). Cause not established (the `adb` intent may not carry a read grant that a real sender app would). Flow 11 asserts only the notice | flow 11; `photo.ts` |
| Pictures are never analysed; stated in UI | working | Check screen, Crop screen |
| Crop (trim edges) a picture, then hand it to the share sheet | working in the browser (trim buttons, preview, "not analysed" wording). Share sheet for a picture NOT TESTED on Android. Covering/blurring parts is not built | `Check.tsx` (Crop), `photo.ts`; e2e "pictures" |
| Ask someone: plain redacted text via own messaging app | working; share sheet opens on both emulators (flow 08). Whether anything arrives cannot be known | `Check.tsx` (Share) |
| Ask someone: encrypted private code for a checked contact | working (browser, two profiles). Not run on two phones | e2e "two phones" |
| Same-phone "demo helper" | SIMULATED, moved to Settings, Demonstration tools, loudly labelled; never offered in ordinary use | `Settings.tsx` |
| Delivery receipts / reply notifications | NOT BUILT (no server, no internet permission); stated in the UI | Share, People, Waiting screens |
| Offline explanation and "no internet access" investigation | done | Settings, Works without internet; docs/OFFLINE_AND_INTERNET.md |
| Detection fixes and a new unseen test set | done, misses remain | docs/EVALUATION.md |
| Sealed drafts at rest | working (unit, browser, emulator process death) | `service.ts`, flows 05/06 |
| Dark colours | working in the browser and, chosen inside the app, on the emulator (flow 14). The emulator's own night mode did not switch, so "follow the phone" dark is NOT TESTED on Android | flow 14 |
| Upgrade from the previous release | PASS (previous release APK, same package id, installed then upgraded in place, app launched) | run 17 `upgrade.txt` |
| TalkBack | NOT TESTED | n/a |
| Physical device | NOT TESTED | n/a |
| Usability sessions | NOT RUN | docs/USABILITY_SESSION_PLAN.md |
| Independent security/crypto review | NOT DONE | DECISIONS D-007 |

## 2. Architecture facts

- Framework: Expo SDK 58, React Native 0.88, native RN screens (no WebView). Web export exists for tests.
- Storage: one XChaCha20-Poly1305 blob under a 32-byte key kept in `expo-secure-store` (Android Keystore-backed, this device only). Sealed drafts use the same key under their own item id (`sc.drafts`), are not in backups, and are deleted on erase. Recovery: a 256-bit recovery secret wraps the key; encrypted backup text; losing both means permanent loss. `allowBackup=false`.
- Sharing crypto: X25519 + HKDF + XChaCha20-Poly1305 composition from `@noble` libraries. Not reviewed.
- Permissions: none (section 8). No external services, no analytics.
- Share-in: `expo-sharing` config plugin adds `ACTION_SEND` filters for `text/plain` and `image/*`. Only unresolved payloads are read.
- Source: `packages/core/src` (engine `indicators.ts`, `links.ts`, `result.ts`, `service.ts`, datasets `dataset.ts`, `holdout2.ts`), `apps/mobile` (`App.tsx`, `src/ui.tsx`, `src/nav.tsx`, `src/shareIn.ts`, `src/photo.ts`, screens), `android-tests/` (Maestro flows and `run.sh`), `e2e/` (Playwright), `.github/workflows/build.yml`.
- Signing: the APK is signed with the public Android debug key (test signing). A private release key is an open owner decision.

## 3. Changes and why

1. **Identity**: id `app.devilwalkx.scamcircle` (Android and iOS), version 0.2.0, versionCode from the CI run number, commit and build time injected through `app.config.js`, shown in Settings, About this build. New unique id means one uninstall of the old test build.
2. **Design foundation** ported from ScopeLock with a new teal identity: tokens with contrast unit tests for light and dark, `ui.tsx` components, top bar with Back, bottom bar (People, Check in the centre, Requests), system Back unwinding, keyboard padding, focus to the page heading, reduced motion, text size on top of the system font scale (never disabled; headings capped at 150%).
3. **Screens around a decision** (docs/SCREEN_DECISIONS.md): result before detail, evidence one tap away, no persona switcher, a clearly marked one-message example instead of loading demo and personal data together.
4. **R3 result screen**: four separate cards; "Not verified" unless the person independently checked; a test scans all 137 sample messages for reassurance wording.
5. **R4 detection**: root-cause fixes for set B (docs/EVALUATION.md), a new unseen set C, results reported with all misses.
6. **R2 share-in** via `expo-sharing` (D-020): `expo-share-intent` 8.0.1 declares Expo 57, not 58.
7. **R5**: voluntary and granular asking (plain text or encrypted code; choose who, what is hidden, note, warning-sign names, expiry); every ending says nothing was sent and there is no receipt.
8. **R6**: Settings page "Works without internet", Home chip, docs.
9. **Hardening found by checking the built APK in CI**: the secure-store and application-info libraries pulled in `USE_BIOMETRIC`, `USE_FINGERPRINT` and an install-referrer permission; all blocked (run 9 failed on this; run 10 onward pass).
10. **Tests/CI**: port 4411 with `reuseExistingServer: false`, `meta application-id` check, strict permission checks, emulator job with Maestro flows.

## 4. Main task, exactly as a person does it

1. Install the APK (Settings, About this build shows the id/commit). Open it: one big **Check a message**.
2. Either tap it and paste/type, or in another app choose Share, then ScamCircle (text arrives in the box with a note saying so).
3. Tap **Check this message**. Read: what was found in the words; what could not be checked; who sent it (**Not verified**); settle it by checking another way (a number you already had, or one you look up yourself from an official source; not the one in the message).
4. Do the check yourself (outside the app). Tap **I checked it another way**, say how and what happened. Only an independent route with a clear answer changes the status to "Checked by you another way".
5. Optional: **Ask someone I trust to look**. Text route: choose what to hide, add a note, then the system share sheet and you pick the app and person. Code route: needs a checked contact on a second phone. Manual or missing: delivery, replies and any confirmation. Nothing is sent by the app.

## 5. Android verification facts (emulator only)

Run 17 (commit `ca0a463`, main). Evidence branch `evidence/run-17`; copied files in `docs/evidence/android-emulator/`.

| Device | Android | Display | Font | Result |
|---|---|---|---|---|
| Emulator "sdk_gphone64_x86_64" (Pixel 6 profile) | 16, API 36 | 1080x2400, 420 dpi | 1.0 | 14 of 14 Maestro flows passed |
| Emulator "Android SDK built for x86_64" (Pixel 5 profile) | 10, API 29 | 1080x2340, 440 dpi | 2.0 (200%) | 14 of 14 Maestro flows passed. Its night mode did not switch (see flow 14) |

- **Install/upgrade**: clean install worked; upgrade from the previous release (same package id) worked on both (app launched). No data-preservation check across the upgrade.
- **Back**: system Back unwinds record to result to first screen and then leaves the app (flow 04). Predictive back is enabled in the manifest; the gesture itself was not exercised.
- **Keyboard**: with the keyboard open the message field and the Check button remain reachable (flow 03).
- **Process death**: an unfinished message survives the process being killed (flows 05/06; `pidof` empty after kill).
- **Offline**: Wi-Fi and mobile data switched off by `svc`, main task repeated and passed (flow 13).
- **Permissions**: `dumpsys package` lists no `android.permission.INTERNET`; the built APK lists no permission except AndroidX's own signature-level receiver permission.
- **Share-in**: text SEND intent, cold start and while the app is open, put the text in the box (flows 09, 10). Picture: PARTIAL (section 1).
- **Share sheet out**: opens for the plain-text route (flow 08). The chooser itself was not inspected.
- **Notifications**: none exist.
- **Startup (emulator, software-rendered, 5 cold starts)**: API 36 about 570 to 740 ms; API 29 about 550 to 720 ms. Memory PSS about 79 MB (API 36) and 90 MB (API 29).
- **Scrolling**: gfxinfo shows 84% (API 36) and 100% (API 29) "janky" frames on the swiftshader software renderer. This is not representative of a phone, and it is also not evidence the app is smooth. NOT MEASURED on hardware.
- **Rotation**: a landscape screenshot was captured (`20-landscape.png`); no layout audit in landscape.
- **Crash scan**: no `FATAL EXCEPTION` for the app in the logcat excerpts.
- **Browser vs emulator**: browser results (99 Playwright runs, axe and layout audits, two-profile sharing, encryption checks) are not Android results. Emulator results are not physical-device results.

## 6. Visual and accessibility evidence

- Before and after screenshots at Pixel 7 (412x915) and 320x568, light and dark, text 200%: `docs/evidence/before/` (commit `62d1378`) and `docs/evidence/after/`.
- Emulator screenshots (final state of each flow, both devices): `docs/evidence/android-emulator/`.
- Contrast: unit-tested for every text/background pair in light and dark (`tokens.test.ts`), body 16 sp, minimum 14 sp, 48 dp targets. The axe scan (WCAG 2.1 AA tags) passes on every screen at normal text, system font scale 2 and dark in the browser. Findings that axe and the audit forced fixes for: accessible names that did not contain the visible text; a scroll region not reachable by keyboard.
- Layout audit (no overlap, no clipped button text, no sideways scroll, 48 px targets) runs on every screen at 3 sizes and at worst-case text (in-app Extra large x 200%).
- Android 200%: both heading sizes are capped at 150% so a title does not take a screen; body text is not capped. At 200% the primary button label wraps to two lines (visible in the API 29 screenshots) and some actions sit below the fold.
- **TalkBack: NOT TESTED.** Roles, labels and focus-to-heading are implemented and checked only through the browser accessibility tree.

## 7. Test evidence

Commands: `npm test` (core 103 tests; mobile 5 token tests), `npm run typecheck`, `npm run eval`, `npm run e2e`, CI workflow `build`.

| Where | Result |
|---|---|
| Core unit tests (103) + design tokens (5) | pass in CI run 17 |
| Playwright, 33 tests x 3 viewports = 99 runs | pass in CI run 17 (browser, not Android) |
| Android APK build, manifest and built-APK permission checks | pass |
| Emulator API 36 and API 29, 14 Maestro flows each | pass in run 17 |

Failures found and fixed along the way (so the pass is not hiding retries): run 9 failed the built-APK permission check (three library permissions); run 10 and 11 emulators failed because after the result screen the page stayed scrolled down, because exact-text assertions did not match the full string, and because a raw library error was shown for a picture; runs 12 and 13 still failed one or two flows at 200% text because buttons were below the fold; run 14/15 API 29 failed one assertion for the same reason; run 16/17 passed. Other fixes: draft text did not re-render; accessible names; keyboard-focusable scroll region; a dialog race in the e2e helper (a flake). Run 13 published a release while its emulator jobs were red (the release notes said so). Run 17 is the first all-green run.

**Detection (docs/EVALUATION.md).** Set A (tuning, 41): 0 and 0. Set B (34, now regression only, tuned on): 0 scams with no signs (was 6), 1 false alarm (was 2; HL13 kept on purpose). **Set C (62, written after the fixes, not tuned on): 12 of 36 scams given no warning signs; 3 of 26 ordinary messages given warning signs.** 6 messages (non-English/unreadable) are "can't tell".

**What these tests do NOT establish:** that ScamCircle protects anyone; that real scams are caught; any behaviour on a physical phone; TalkBack; real senders for share-in; that a person reads "not verified" correctly (usability NOT RUN); security of the key handling beyond unit tests; the sharing composition's cryptographic soundness (unreviewed); that the emulator's 200% font matches every phone.

Negative tests present: no request leaves the page and none carries case content; links are never opened or clickable; refuses to run without WebCrypto; wrong recovery secret refused; replayed, mis-addressed and garbage codes refused; unverified contacts cannot receive cases; a number from the message does not count as a check; result text never contains reassurance wording for any sample.

## 8. Privacy and security

- **Leaves the device**: nothing by the app itself (no internet permission). Through the share sheet only what the person chooses: redacted text (plain), a cropped picture (not encrypted by ScamCircle), or an encrypted code. The receiving app and recipient see what is shared; the app cannot see whether it was sent.
- **Who can read**: messages, contacts, keys: only this app on this phone (encrypted; key in Keystore-backed storage). A recipient of plain text or a picture can read and copy it. A recipient of a code can read only what was chosen.
- **Share-in**: any app can send text to ScamCircle when the person picks it; nothing is analysed or stored until Check. Web addresses are treated as text and never resolved or opened.
- **Recovery / revocation / deletion limits**: no recovery without the recovery secret plus a backup text; stopping a request closes it only where the stop code is used and cannot take back what was seen; delete removes the local case and makes stop codes for active shares; temporary re-encoded pictures stay in the app cache until the phone clears it (open item).
- **Verified vs intended**: verified here: manifest and built-APK permissions, no network use in the browser, ciphertext-only storage in unit and browser tests, drafts sealed. Intended but not verified on Android: Keystore behaviour on real hardware, lock-screen/app-switcher exposure (not hidden; D-018), clipboard exposure.
- **Open reviews**: independent crypto review, privacy/legal review (PRIVACY_REGISTER), accessibility review with TalkBack, usability sessions.

## 9. Known issues

| # | Severity | Issue | Impact / repro | Code | Proposed fix |
|---|---|---|---|---|---|
| 1 | High | The checker misses many scams (12 of 36 in unseen set C) and false-alarms on some ordinary messages (3 of 26) | A person may read "no warning signs" as reassurance despite the wording | `indicators.ts` | Larger independent test set; add scam types listed in EVALUATION.md; consider showing "no signs" less prominently |
| 2 | Medium | Share-in of a picture not confirmed on Android: picture could not be opened in the emulator test | Real senders may or may not work | `photo.ts`, `shareIn.ts` | Test from a real sender app on a device; check the read grant |
| 3 | Medium | No delivery or reply confirmation for any sharing | Person must ask directly | design (D-002) | Needs a server and a deliberate permission change |
| 4 | Medium | Android 200% text: primary button label wraps, many actions below the fold; headings capped | Usable, long scrolling | `ui.tsx`, `Check.tsx` | Sticky action bar; usability test with large text |
| 5 | Medium | Dark mode that follows the phone untested on Android | Unknown | `design/theme.tsx` | Test on a device or an emulator whose night mode switches |
| 6 | Low | Temporary pictures stay in the app cache | Trace of a private picture | `photo.ts` | Delete after sharing (needs `expo-file-system`) |
| 7 | Low | Emulator scrolling shows heavy jank on the software renderer | Unmeasured on hardware | n/a | Measure on a phone |
| 8 | Low | The `expo-sharing` plugin also adds an empty `SEND_MULTIPLE` intent filter | Harmless, matches nothing useful | plugin | Upstream/ignore |
| 9 | Low | The vague-opener rule fires on real messages ("Hey Mum, are you free? Can you babysit?") | False alarm | `indicators.ts` | See EVALUATION.md |

## 10. Next actions

1. Owner decision: use the app on a real phone first? Needs a person with a phone; no cost.
2. Run docs/USABILITY_SESSION_PLAN.md with real people (needs consent and 5+ participants). Set success criteria first.
3. TalkBack pass on a device (half a day).
4. Write a larger, independently authored detection test set; decide a policy for "no warning signs" wording based on the usability results.
5. Independent review of the sharing composition and the 4-word check (expert; cost).
6. Decide on a private release key and Play distribution (owner).
7. Decide whether a server for delivery receipts is acceptable (it would end the no-internet design, D-003).
8. CI speed-up suggested by the lead (reuse an earlier APK for emulator re-runs, x86_64-only on non-main builds, Gradle cache) was not adopted in this pass: the work finished before it paid off. It would cut roughly 15 minutes per iteration.

## Requirements checklist

| Req | Status | Notes |
|---|---|---|
| R1 Home centre action, one primary, others secondary | PASS (browser + emulator) | Layout test measures centring |
| R2 Share-in text | PASS on emulator via `adb` intents; NOT TESTED from a real sender app / device |
| R2 Share-in picture | PARTIAL | Offered and acknowledged, not opened in the test |
| R2 Crop only for sharing, "not analysed" wording | PARTIAL | Browser PASS; Android share of picture NOT TESTED |
| R2 Permissions only if needed | PASS | None added |
| R3 Four things; never "safe"; inconclusive still gives independent check | PASS (unit + browser + emulator flows) |
| R4 Analyse and fix the 6+2; new unseen set; honest results | PASS for process; misses remain (12/36, 3/26) |
| R5 Voluntary, granular, labelled incomplete; demo labelled | PASS in UI; real two-phone delivery NOT TESTED; no confirmation exists |
| R6 Offline explained; internet investigation recorded | PASS |
| R7 / Shared: identity, id, version 0.2.0, commit in Settings | PASS |
| Ports 4411 / `reuseExistingServer:false` / application-id meta test | PASS |
| Forbidden permissions fail CI; allowBackup false; predictive back flag | PASS (gesture not exercised) |
| Design foundation, contrast tests, 16 sp, 48 dp, light/dark, reduced motion, 200% | PASS in browser; PARTIAL on Android (200% emulator only; dark follow-system NOT TESTED; reduced motion NOT TESTED on Android) |
| Screens decisions doc | PASS (docs/SCREEN_DECISIONS.md) |
| Back, keyboard, insets, process death, offline, drafts | PASS on emulator (insets: browser simulation plus emulator screenshots only) |
| Permission denial flows | n/a (no permissions requested) |
| Clean install and upgrade | PASS (emulator) |
| Emulator tests, evidence branch, honest release notes | PASS |
| TalkBack | NOT TESTED |
| Physical device | NOT TESTED |
| Usability sessions | NOT RUN (plan written) |
| Docs updated (README, STATUS, GETTING_STARTED, DECISIONS, PERMISSIONS, SECURITY_TESTS, RISK_REGISTER) | PASS |
