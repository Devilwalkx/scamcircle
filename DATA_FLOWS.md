# Data flows (draft)

Synthetic build. Where a flow says "nothing", that describes this build, not a promise about any later service.

## Actors and where data lives
| Place | Holds | Protection |
|---|---|---|
| The owner's phone | messages, findings, contacts, private key, requests, replies | One encrypted blob; key in secure storage (Android Keystore via expo-secure-store) |
| The reviewer's phone | requests received (redacted text), their own replies, their private key | Same |
| The channel the people use to move codes (messaging app, e-mail, paper) | share/reply/stop **codes** and contact codes, as text | Codes are encrypted to one recipient; the channel provider sees the code text, size and timing, and who sent it to whom |
| Clipboard / share sheet | the code while it is being moved | Android clipboard is readable by other apps in some versions; this is not controlled by ScamCircle |
| Servers | **nothing: there is no server** | `INTERNET` permission blocked in the manifest |

## Flows
1. **Check a message**: typed/pasted text -> engine (in memory) -> case record -> encrypted vault. No network.
2. **Screenshot**: image picker -> re-encode (EXIF removed) -> checked -> held in memory while typing -> discarded. **Open item:** the re-encode step writes a temporary file in the app's cache folder, which Android clears at its own pace; ScamCircle does not delete it.
3. **Contact code**: name + public key as text, moved by the people. Not secret, but it reveals the name chosen and that two people are connected if someone sees both.
4. **Share code**: sender's chosen redacted text + note + names of warning signs, sealed to one recipient key, with sender key, recipient key, grant id, times in the clear (needed to route and expire). Anyone who sees the code learns those values and its size, not the text.
5. **Reply code**: method, outcome, findings, times, sealed to the owner.
6. **Stop code**: sealed notice that closes a request.
7. **Backup text**: vault sealed with the device key; the device key is wrapped by the recovery secret. Account id in the clear.
8. **Logs / crash reports / analytics**: none are collected or sent. `redactForLog` exists for any future logging; tests check core has no `console.*`.
9. **Notifications**: none.

## Metadata not hidden
Code sizes, who exchanged codes, timing and the public keys. Words shown on screen, the clipboard and screenshots are outside the app's control.

## Third-party data
A message can include another person's name, number or account details, and may allege wrongdoing by a named person. See PRIVACY_REGISTER.md. The app lets the person hide text before sharing and shows exactly what is shared. It does not publish anything and has no public list.
