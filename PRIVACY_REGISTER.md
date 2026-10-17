# Privacy register (draft for review, not legal advice)

> I (the builder) could not read ICO guidance or legislation from the sandbox. **Nothing below is a legal conclusion.** Rows marked OPEN need a qualified person. No consent, contract, registration or approval is claimed to exist.

## 1. Processing inventory (this build)
| Operation | Individuals | Data | Where | Recipients | Notes |
|---|---|---|---|---|---|
| Check a message | the user; people named in the message | message text, findings | user's phone only | none | no network |
| Trusted circle | user; reviewer | display names, public keys, who is checked | each phone | the other person (by code) | |
| Share a case | user; reviewer; **third parties in the text** | user-redacted text, note, warning-sign names, times | encrypted code moved by the people | chosen reviewer | |
| Reviewer reply | reviewer | method, findings, times | encrypted code | owner | |
| Backup | user | whole vault, encrypted | text the user stores | wherever the user puts it | |

## 2. Roles (OPEN)
In this build the provider (the project) runs no service and receives no personal data, so no controller/processor relationship for user data arises from the app itself. Whether the *users* are acting in a purely personal capacity (household exemption), and how that changes if a service/server is added, is **OPEN**. A commercial provider is not automatically covered by the household exemption.

## 3. Lawful basis (OPEN)
Not decided. No consent flow is built and none is claimed.

## 4. Special categories and criminal-offence information (OPEN: Article 10 / DPA 2018)
- Messages may allege a crime ("you are under investigation") or accuse a named person (a "fraudster" or a relative). The app **stores such text only on the user's phone and in a share code chosen by the user**, keeps no database, builds **no public blacklist, no reputation score and no shared list of suspected offenders**, and labels results as "warning signs", not "scammer".
- Whether holding or sharing that text engages Article 10 and the DPA 2018 Schedule 1 conditions for a *provider* is **OPEN** and must be decided before any service. Nothing here is a conclusion that it is lawful.
- Health information can appear in messages (e.g. "hospital"). Article 9 position **OPEN**.

## 5. Third-party data in screenshots and messages (OPEN)
Screenshots and pasted messages may contain other people's names, numbers, conversations and account details. Controls built: screenshot never stored or shared; the user types the text; suggested hiding of phones/emails/bank details/postcodes (default on); manual hide; exact preview. Not built: automatic detection of names/addresses; a lawful-basis assessment for the user's upload of others' data.

## 6. DPIA screening (OPEN)
Likely high-risk indicators for a real service: vulnerable people, allegations, relationships between people. A DPIA has **not** been done.

## 7. Suppliers, transfers (none in this build)
No hosting, analytics, crash reporting, notification, OCR or AI supplier. Expo/React Native libraries are bundled in the app and make no calls (INTERNET blocked). Code-moving channels chosen by users (messaging apps) are outside the project and each is its own controller for what passes through it (OPEN to assess for guidance wording).

## 8. Rights handling (OPEN)
No server means no data held by the project to access, correct or erase. The user can export/delete on their own phone. A real service would need a procedure.

## 9. PECR (OPEN) / incident procedure (OPEN)
No marketing, tracking or cookies in this build. No incident procedure exists.

## 10. Disclosures the app makes
"What this app cannot do" screen; recovery warning; revocation limit; "not delivered until you send it"; synthetic-data notice.
