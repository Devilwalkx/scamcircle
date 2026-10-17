# Security and safety tests

What is tested, where, and what is **not**. "Unit" = vitest in `packages/core/test`. "E2E" = Playwright in `e2e/tests` against the web export at Pixel 7, 390 px and 320 px viewports. Nothing here replaces an independent security review, real-device testing or OWASP MASVS assessment.

| # | Brief's acceptance item | How it is tested | Where |
|---|---|---|---|
| 1 | Fake family request, no link | flagged from words alone (new number, money, secrecy); no link present | unit `indicators.test.ts`; dataset T01/T02/H01/H02 |
| 2 | Legitimate urgent request | not called a scam; still not called genuine | unit `indicators.test.ts`; dataset TL02/TL10/HL04 |
| 3 | Reviewer compromise / new-device key change | key change keeps old key, demotes to unchecked, blocks sharing and refuses old-key messages; compromised reviewer's reply is only "reported", never "safe" | unit `circle.test.ts`; E2E "a changed contact code is surfaced" |
| 4 | Malicious / replayed / expired bundle | replay, expiry, future date, wrong recipient, tamper of body/header/grant, forged sender, hostile text, unknown sender, unverified sender, stale version | unit `circle.test.ts`; E2E two-phone test (replay, wrong-phone, junk) |
| 5 | Expired / revoked grants | replies refused after expiry or revoke; stop code clears the request; removing a person revokes theirs | unit `circle.test.ts` |
| 6 | Attempted decryption with wrong key | `wrong_recipient`, `cannot_open`; vault wrong key/tamper/rollback | unit `circle.test.ts`, `vault.test.ts` |
| 7 | Lookalike domains | brand lookalikes, brand in subdomain, `@` trick, IP host, shorteners, Cyrillic confusables, punycode decoding; genuine domains not flagged | unit `links.test.ts`, dataset |
| 8 | URL leakage / no fetching | `fetch` stubbed to throw is never called; source scan finds no network API; E2E records every request and finds none outside the app's own files, none containing case text; no `<a href>` rendered; `INTERNET` permission blocked | unit `indicators.test.ts`, `appconfig.test.ts`; E2E privacy tests |
| 9 | Prompt injection | reported as a warning sign; cannot flip a scam to clean; pure function; hostile shared text creates only one inbox item and no reply/share/contact change | unit; E2E |
| 10 | Non-English | "cannot assess", links still analysed; mixed language gets a note | unit; dataset by language |
| 11 | Unreadable / cropped | `unreadable`/`too_short` -> cannot assess | unit; E2E |
| 12 | No network | as 8 | |
| 13 | No reviewer response | honest states: "not delivered until you send it", "cannot see whether it arrived", "No reply after 24 hours", "Expired"; guidance without emergency claims | unit `circle.test.ts` |
| 14 | Deletion / restore tombstones | deleted case is gone from storage; restoring an older backup does not bring it back | unit `vault.test.ts` |
| 15 | Key loss / recovery | missing key fails closed; recovery secret restores; wrong secret refused; E2E backup/restore | unit; E2E |
| 16 | Proof no private content in any request or log | E2E captures all requests (URL, body, headers) and console output across a full flow and finds no case text or numbers | E2E |
| 17 | Sensitive lock-screen exposure | **not tested and not implemented**: no notifications exist; the app does not hide itself in the recent-apps view | gap, see DECISIONS D-018 |
| 18 | Encryption at rest | persisted data checked for plaintext markers (long unique strings, not short substrings) | unit; E2E |

Other E2E coverage: no horizontal scroll, touch targets >= 44 px, no text overflowing any button, no two interactive elements overlapping, on every screen at normal text, system font scale 2, in-app "Extra large", and both combined; axe WCAG 2 A/AA scan on every screen; simulated Android system bars (`?insets=44,48`); keyboard operation; installable manifest; refusal without WebCrypto; text-size persistence.

## Mutation checks (safeguards broken on purpose, tests must fail, then restored)
See STATUS.md for the results recorded this build.

## Not covered
Real-device behaviour of secure storage, secure random, image picker and clipboard; screen-reader use on a phone; dependency vulnerability review (`npm audit` has not been triaged); fuzzing; side channels; independent cryptographic review; backend tests (no backend).
