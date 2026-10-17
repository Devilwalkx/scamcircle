# ScamCircle

A private phone app for looking at a suspicious message, checking it another way, and optionally asking one trusted person for help.

> **Test build, version 0.2.0, app id `app.devilwalkx.scamcircle`.** No server, no cloud AI, no OCR, no network permission. It never says a message is "safe". The way it locks and shares things (an HPKE-like composition of audited libraries) and the word-comparison step **need independent review before any real use**. It has **not been run on a physical phone** by its builder (GitHub emulator runs only, see docs/ANDROID_PASS_REPORT.md).

Install on Android: see [GETTING_STARTED.md](GETTING_STARTED.md). Download: https://github.com/Devilwalkx/scamcircle/releases/tag/latest-test-build (`ScamCircle-test.apk`).

## What it does
- **Check a message**: paste text, or share text to ScamCircle from another app (Android share sheet). One result screen with four separate things: what was found in the words, what could not be checked, who sent it (always "Not verified" unless you checked another way) and how to check it another way (ring a number you looked up yourself from an official source). Never "safe".
- **Pictures**: not read, not analysed, not stored. You type what they say. You may trim a picture and hand it to the share sheet (not encrypted by ScamCircle).
- **Local rule engine** (English only), links analysed as text and never opened. Non-English, unreadable or very short text -> "could not read enough to tell". See docs/EVALUATION.md for what the made-up test sets show (including the misses).
- **Ask someone you trust**, voluntary and granular: plain redacted text through your own messaging app, or an encrypted code for a checked contact (X25519, 4-word check, expiry, stop codes). No delivery or reply confirmation exists and the app says so.
- **Private vault**: XChaCha20-Poly1305, key in secure storage, recovery secret, encrypted backup, sealed drafts, erase.
- **Offline by design**: no internet permission. Demonstration tools (a pretend second person on the same phone) are in Settings, labelled as a simulation.

## Layout
```
packages/core   pure TypeScript logic + tests (vitest)
apps/mobile     Expo app (Android + web export)
e2e             Playwright tests against the web export
```

## Commands
```
npm install
npm test            # core unit tests
npm run typecheck
npm run eval        # prints the synthetic evaluation tables
npm run e2e         # builds the web export and runs Playwright (needs Chromium)
```

## Documents
docs/ANDROID_PASS_REPORT.md, docs/SCREEN_DECISIONS.md, docs/EVALUATION.md, docs/OFFLINE_AND_INTERNET.md, docs/USABILITY_SESSION_PLAN.md, SPEC, DATA_FLOWS, THREAT_MODEL, PERMISSIONS, PRIVACY_REGISTER, RETENTION, RISK_REGISTER, SECURITY_TESTS, DECISIONS, STATUS. They are drafts for review, not legal advice or certification.

## Honest limits
Competitor claims and legal/ICO sources were **not** verified (sandbox could reach only npm and GitHub). No general accuracy is claimed: the evaluation set is small, synthetic and written by the builder (see STATUS.md for numbers by scenario). Test APK is signed with the Android debug key.
