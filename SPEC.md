# ScamCircle specification (draft, synthetic build)

> Synthetic demonstration data. Draft for review. Not legal advice, not certified, not a security audit.

## 1. What it is
A private phone app that helps an adult look at a suspicious message, **check it another way**, and optionally ask **one chosen trusted person** for help. It is a user-led workflow. It does not promise to stop scams, does not watch the phone, and does not touch banking or payments.

## 2. What this build actually does ("fully functional" here)
There is no server, no cloud AI and no OCR. The app is a complete local-first case vault:

| Area | Behaviour |
|---|---|
| Import | Paste text, or pick a screenshot and **type what it says** (no OCR). The picture is shown only while typing, has metadata removed, and is not stored or shared. |
| Indicator engine | Deterministic, local, English-only rules in `packages/core/src/indicators.ts` and `links.ts`: claimed identity, new-number claims, urgency, secrecy, requests for money, account details, changed bank details, gift cards, crypto, codes/PINs, remote-access tools, links (lookalike, unicode/punycode, shorteners, IP, `@` trick), hostile instructions aimed at software, missing information. Output is structured evidence with source spans. Links are **analysed as text and never opened**. |
| Outcomes | pending / not verified / indicators found / specific verification step completed. **Never "safe".** Short, unreadable or non-English text: "we can't tell from the message alone". |
| Verification route | Always starts "Do not use the phone number or link in the message." Suggests an independent route by claimed identity. Numbers/links/threads supplied by the message are never counted as independent. |
| Trusted circle | Each phone has an X25519 identity. A **contact code** (name + public key) is exchanged by copy/paste. The two people compare **4 words** out loud before the contact is "checked". Unchecked contacts cannot receive cases. A changed key demotes the contact to unchecked. |
| Sharing | Owner chooses one checked person and the **exact redacted text**, an expiry and an optional note. The app creates an encrypted **share code** (text). It is **not delivered until the owner sends it**. The reviewer imports it, records method, findings and time, and creates an encrypted **reply code** (versioned). A thumbs-up is classed as "opinion only". |
| Control | Owner can stop a request (optional stop code), remove a person, delete a case (tombstone). Stopping cannot recall copies. |
| Vault | One XChaCha20-Poly1305 blob on the device; key in Android Keystore-backed secure storage (browser: non-extractable WebCrypto key). Recovery secret, encrypted backup/restore, erase. |
| Demo | "See an example first" / Demo options: a built-in second person on the same phone, a loaded story, and a demo clock. |

## 3. Out of scope (and why)
Servers, accounts, push notifications, contact scraping, reading other apps' messages, banking, payments, URL fetching, cloud AI/OCR, public blacklists of suspected offenders, emergency-service claims, caller-voice checks, investment advice. See DECISIONS.md.

## 4. Language rules the product follows
No "safe", "legitimate", "verified safe", "production ready", "fully GDPR compliant", "this will stop scams". Every limit above is stated in the app (Settings > What this app cannot do).

## 5. Screens
Home (4 buttons + recent checks + text size) -> Check a message (3 steps) / My trusted people / Messages waiting for me / Settings and privacy (with Demo options). Every other screen starts with "‹ Back to home".

## 6. Acceptance tests from the brief and where they live
See SECURITY_TESTS.md. Pilot gates in the brief (30 family pairs, pricing £5-£10) are **not** run; they need real consenting people.
