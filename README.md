# ScamCircle (synthetic demo)

A private phone app for looking at a suspicious message, checking it another way, and optionally asking one trusted person for help.

> **Everything is synthetic.** No server, no cloud AI, no OCR, no network permission. It never says a message is "safe". The way it locks and shares things (an HPKE-like composition of audited libraries) and the word-comparison step **need independent review before any real use**. It has **not been run on a real phone** by its builder.

Install on Android: see [GETTING_STARTED.md](GETTING_STARTED.md). Download: https://github.com/Devilwalkx/scamcircle/releases/tag/latest-test-build (`ScamCircle-test.apk`).

## What it does
- **Check a message** (3 steps): paste text or type out a screenshot -> one result card and the advice "do not use the number or link in the message" -> record how you checked another way. Outcomes: pending / not verified / warning signs found / specific verification step completed.
- **Local rule engine** (English only) for new-number claims, urgency, secrecy, money/gift-card/crypto/code requests, changed bank details, lookalike/unicode/punycode/shortened links (text only, never opened) and instructions aimed at software. Non-English, unreadable or very short text -> "can't tell".
- **Trusted people with real serverless sharing**: X25519 identities, contact codes, a 4-word out-of-band check, redacted sharing as an encrypted text code, versioned encrypted replies, expiry, stop codes, key-change demotion.
- **Private vault**: XChaCha20-Poly1305, key in secure storage, recovery secret, encrypted backup, deletion tombstones, erase.
- **Built-in demo** second person, example story and demo clock.

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
SPEC, DATA_FLOWS, THREAT_MODEL, PERMISSIONS, PRIVACY_REGISTER, RETENTION, RISK_REGISTER, SECURITY_TESTS, DECISIONS, STATUS. They are drafts for review, not legal advice or certification.

## Honest limits
Competitor claims and legal/ICO sources were **not** verified (sandbox could reach only npm and GitHub). No general accuracy is claimed: the evaluation set is small, synthetic and written by the builder (see STATUS.md for numbers by scenario). Test APK is signed with the Android debug key.
