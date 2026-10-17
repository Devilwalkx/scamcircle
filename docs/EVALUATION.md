# Detection evaluation: what was measured, what changed, what remains wrong

Nothing here is an accuracy figure or evidence that ScamCircle protects anyone. All messages are made up by the same author (an AI model and its operator). Sets are small and English-heavy.

## Which set is which

| Set | Ids | Role |
|---|---|---|
| **A, tuning** | T*, TL* (41) | The rules were written against it. It always looks perfect. |
| **B, dev / regression** | H*, HL* (34) | Written before its results were read, and called "held-out" then. Its results WERE then read and the rules changed, so it is **no longer held out**. Kept as a regression set. No case was removed or weakened. |
| **C, holdout-2** | N*, NL*, NX* (62) | Written AFTER the rule changes (git: set B fixes are commit da9ec81, set C is the next commit) and not tuned on. |

Set C method: the author listed common scam types and ordinary look-alike messages from general knowledge (not from the rule list), wrote each message once with its label, ran the engine once (`npm run eval -w @scamcircle/core`), and recorded the results unchanged. The rules were not edited afterwards. Its exact results are pinned by a test, so any later rule change shows up and the set stops being a holdout if it is tuned on. Same author as A and B, so it is not independent.

## Set B: root causes and fixes (before: 6 false reassurances, 2 false alarms)

| Id | Root cause | Fix |
|---|---|---|
| H03 vague "Hey Mum, are you free? I need a favour" | No rule for a relative greeting followed by an unexplained ask | New rule "vague family opener" (strong). Over-broad by nature: it also fires on NL01 in set C |
| H04 bank text that only says "call 0800..." | A number supplied by the message was only context; the bank name before a colon was not recognised | New "asks you to ring a number it gives" (moderate); bank name followed by colon counts as a bank claim |
| H05 arrest-warrant threat | No threat rule; "HM Revenue and Customs" not recognised | New threat rules (arrest strong, legal action moderate); name added |
| H07 "we have switched banks" | Payment-detail-change patterns did not include switched/moved bank or "future payments should go to" | Patterns added |
| H11 "santandér-secure.com" | Brand comparison did not fold accents | Accent folding in the comparison; accent alone is still only a moderate sign |
| H21 job registration fee | No job-offer or up-front-fee rule | Two moderate rules (easy income, up-front fee) |
| HL08 printer manual "ignore previous instructions" (false alarm) | Phrase alone was rated strong | Split: the phrase alone is moderate; strong only when followed by instructions aimed at software |
| HL13 "Can you lend me £50 urgently?" (false alarm) | **Not fixed on purpose.** As text it is identical to the opening of a family scam; suppressing it would create false reassurance |  |

Result on set B after the changes: 0 scams with no signs, 1 ordinary message given signs (HL13). This says nothing about new messages, because the rules were changed to fit it.

## Set C results (not tuned on)

Counts as printed by the evaluation script: 62 messages, 36 scam, 26 ordinary, 6 not readable by the engine (non-English or unreadable, shown as "can't tell", counted separately).

- **Scam messages given no warning signs: 12 of 36** (N03, N09, N12, N14, N21, N24, N25, N27, N28, N29, N31, N32).
- **Ordinary messages given warning signs: 3 of 26** (NL01, NL08, NL13).

Why, by group (read from the output, not fixed):
- Callback phishing with only a number to ring (N03, N31): one moderate sign is not enough to alarm.
- Advance-fee, inheritance, "safe place for savings", refund-for-bank-details, buy-equipment job offers, "banking details are now different" (N09, N21, N24, N28, N29): no vocabulary for them.
- A single moderate sign (N12 easy income, N25 shortened link, N27 pay-an-insurance-fee, N32 a payment ask) never reaches the two-sign threshold.
- N14: "I'm texting from my new number" opener from "Mum" with a vague "let me know when you're free" misses the opener rule (which needs a greeting at the start).
- False alarms: NL01 (a real "are you free, can you babysit" message hits the vague-opener rule), NL08 (a real surgery message: phone number plus "before 5pm"), NL13 (a surprise-party secret hits the secrecy rule).

A real person asking a relative for help, a surgery asking you to ring, and a party secret look like scams to a word-pattern engine. The tuning that would remove some of these would add false reassurance elsewhere.

## What this does not establish
- It does not show the app protects anyone, or that a message with no warning signs is fine.
- Sets are small, written by one author and English-heavy. Real scams change and are written to avoid known patterns.
- The in-app screen "How well does the checker work?" reads these sets live and says the same.
