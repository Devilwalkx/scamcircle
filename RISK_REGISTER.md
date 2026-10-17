# Risk register (draft)

Likelihood/impact are the builder's rough judgement, not measured. Status: Mitigated (a control and test exist), Partly, Open.

| ID | Risk | L | I | Control | Status |
|---|---|---|---|---|---|
| R1 | User reads "no warning signs" as "safe" | H | H | No safe label anywhere; wording "That is not a check"; reassurance-wording test; verification advice first | Partly (people may still over-read) |
| R2 | False reassurance on a scam the rules do not match | H | H | Held-out misses are published by scenario (STATUS.md); the app tells the user the limits | **Open by nature of a small rule set** |
| R3 | False alarms on legitimate messages | M | M | Published by scenario; engine does not call anything a scam | Partly |
| R4 | Verifying with the scammer's own number | M | H | Advice, method catalogue marks it non-independent; recording it does not complete a check | Mitigated |
| R5 | Rubber-stamp "Yes, they match" on the word check | M | H | Words shown large, instructions to use another channel | **Open: needs usability test and review** |
| R6 | Sharing crypto composition is flawed | L-M | H | Audited primitives, AAD, tests | **Open: unreviewed** |
| R7 | Compromised reviewer | L | H | Replies labelled as reports; key-change demotion; remove reviewer | Partly |
| R8 | Third-party data exposure in shared text | M | M | Hide controls, exact preview, never share images | Partly |
| R9 | Permanent loss on key loss | M | M | Recovery secret + backup; clear warning | Mitigated (user must act) |
| R10 | Phone access without lock | M | H | Relies on phone lock | Open (no app lock, no switcher hiding) |
| R11 | Allegation data / Article 10 | ? | H | No lists, no reputation; stays on user's phone | **Open (legal)** |
| R12 | Competitor assumption wrong | ? | M | Not asserted anywhere | Open (unverified here) |
| R13 | App never run on a real phone | H | M | Build is tested on web and Android build only | **Open: user test needed** |
| R14 | Manual transport confusion (code not sent, wrong person) | H | M | Honest delivery states, confirmation card naming the person and content | Partly |
| R15 | Clipboard/screenshot leakage | M | M | Disclosed | Open |
