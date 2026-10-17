# Threat model (draft)

Scope: this serverless, synthetic build. STRIDE-style but short. "Mitigation" says what exists; "Gap" says what does not.

## Assets
Message text and findings; contact list and who asked whom; private identity key; the device key; recovery secret and backups; share/reply/stop codes while in transit.

## Actors
Owner; trusted reviewer; **impersonator** (the scammer); **man in the middle** during code exchange; **compromised reviewer** (their phone or account); someone with brief physical access to an unlocked phone; other apps on the phone; the provider of the channel used to move codes; a developer/maintainer (no server, so no server staff access exists).

## Threats
| # | Threat | Mitigation | Gap |
|---|---|---|---|
| T1 | Message tells the app to reassure the user or share data (prompt injection) | Engine is pure rules, no model. Hostile phrasing is reported as a warning sign. Imported share text is stored and shown as text only. Tests: injected text cannot change outcome; importing it changes only one inbox item | Rules cover common English phrasings only |
| T2 | User is steered to "verify" by calling the scammer's number | The first advice on every result says not to. Verification methods that use message-supplied routes never complete a check | A user can still ignore the advice |
| T3 | Attacker substitutes their key during contact exchange | Both people compare 4 words out of band; unverified contacts cannot receive or be heard | The comparison is a Yes/No tap and can be rushed; about 66 bits of fingerprint; **needs independent UX/crypto review** |
| T4 | Reviewer gets a new phone / key changes / impersonator claims to be the reviewer | New key under a known name does not replace the old key; contact is demoted to unverified; sharing blocked; their messages refused until re-checked | A different name for the same person looks like a new contact |
| T5 | Reviewer is compromised and replies "genuine" | Replies are labelled "reported by <name>; the app cannot check this itself". A reply never produces "safe". Guidance to check independently | The owner may over-trust the reply |
| T6 | Replay / reordering of codes | Message ids remembered; replies need a higher version than any seen; expired and future-dated codes refused; replies only accepted for a known, active, unexpired request from the addressee | Expiry relies on each phone's clock |
| T7 | Tampering / wrong recipient | AEAD with header as authenticated data; wrong key fails | Composition unreviewed (D-007) |
| T8 | Someone sends a hostile code (malicious invitation) | Unknown or unverified sender refused before decrypting; strict schema validation; size caps | A verified-but-compromised sender can still send hostile text (shown as text) |
| T9 | URL tricks / SSRF | Links are analysed as text. No fetch, no WebView, no link rendering (a test checks there are no anchors and no external requests) | Lookalike list is small; the engine can miss lookalikes (see held-out misses) |
| T10 | Phone theft / shoulder-surfing | Data encrypted at rest with key in secure storage | No app lock or PIN; no task-switcher hiding; anyone who unlocks the phone can open the app |
| T11 | Lost key or phone | Recovery secret + backup text. Without them, loss is permanent and fails closed | User must keep the secret safe |
| T12 | Downgrade / rollback of vault ciphertext | Version in authenticated data | Restoring old ciphertext **and** its version is not detected |
| T13 | Other apps read clipboard / screenshots | Not controllable | Documented to the user |
| T14 | Content in logs, crash reports, notifications | None collected; `INTERNET` blocked; no notification code | Native crash dumps on the phone are outside the app |
| T15 | Revoked reviewer keeps data | Stop code closes the request in their app and clears text | Cannot recall copies or stop a modified app |
| T16 | Third-party data in screenshots | Screenshot never stored/shared; text hide controls; exact preview | Names/addresses not auto-detected |
| T17 | Weak web storage | Web build documented as weaker | Intended target is the APK |

## Not defended
A compromised or rooted phone, a malicious build of the app, a coerced user, traffic analysis of who exchanges codes.
