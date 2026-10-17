# Getting ScamCircle on your phone (no GitHub experience needed)

**What this is:** a test version of ScamCircle. Everything in it is **made-up demonstration data**. It helps you look at a suspicious message, notice warning signs, and check it another way, optionally with someone you trust. It **cannot tell you a message is real or safe**, and it is **not for real private messages yet** (the way it locks and shares things has not been reviewed by an expert).

I have not been able to run it on a real phone myself, so you are the first person to try it. If a step looks different, tell me which step and send a screenshot.

---

## Part 1: Install on an Android phone

1. **On your phone**, open Chrome and go to:
   **https://github.com/Devilwalkx/scamcircle/releases/tag/latest-test-build**
2. If GitHub asks you to sign in, sign in with the Devilwalkx account (the project may be private).
3. Scroll to **Assets**. Tap **ScamCircle-test.apk**. It downloads.
   - If Chrome says *"This type of file can harm your device"*, tap **Download anyway**. This is a test build, not from the Play Store.
4. When it finishes, tap **Open**.
5. Android may say your phone isn't allowed to install unknown apps from this source. Tap **Settings**, switch on **Allow from this source**, press back, then tap **Install**.
6. If **Play Protect** warns about an unrecognised developer, tap **Install anyway**. That is expected for a test build.
7. Tap **Open**. You should see a small yellow note saying **Synthetic demonstration data**, and four big buttons.

The app asks Android for **no permissions at all** (no internet, no camera, no contacts, no location). It cannot send anything by itself.

## Part 2: A 2-minute tour (one phone)

1. On Home, tap **See an example first**. A made-up story appears under **Recent checks**.
2. Tap **Open**. You see one result card: **“We found N warning signs”**, and a big blue box: **“Do not use the phone number or link in the message. Check it another way.”** That is the most important part of the app.
3. Tap **See what we noticed** to see the highlighted words and what we could not check. Tap again to hide it.
4. Tap **Check a message** on Home. Paste or type any message. Try one that says *“Hi Mum, new number, can you send £300 today? Don't tell Dad.”* then try a friendly one like *“Back at five, need anything?”*. Notice the friendly one is **not** called safe. It says **“That is not a check.”**
5. Tap **Settings and privacy**. Change **Text size**, make a **recovery secret** (write it down: it is shown once), or read **What this app cannot do**.
6. Pictures: **Use a screenshot instead** shows your picture only while you type what it says. The app cannot read pictures. It does not save the picture.

## Part 3: Try sharing with a second person

**With a second phone** (best):
1. Both phones install the app. On each: **My trusted people > Add a person**. Type your name, **Save my name**, then **Copy code** and send it to the other person (any messaging app).
2. On each phone tap **Next: paste their code**, paste, then **Add this person**.
3. Each phone now shows **4 made-up words** for the other person. **Phone each other** (or meet) and read your own words out (they are under **My code words**). If they match what the other phone shows, tap **Yes, they match**. If not, tap **No** and do not share anything.
4. On phone 1: **Check a message**, paste a message, **Ask someone I trust**, pick the person, choose what to hide, **Review**, **Create the code**. Then **Copy code** and send it. **It is not delivered until you send it.**
5. On phone 2: **Messages waiting for me**, paste the code, **Open the code**, **Open**, **Reply**. Say *how* you checked and what you found (a thumbs-up on its own does not count). Send the reply code back.
6. On phone 1: **Messages waiting for me**, paste the reply. Open the message to see it.

**With one phone:** **Settings and privacy > Demo options > Add a demo second person**. Share to “Demo helper (same phone)”, tap **Hand it to the demo helper now**, then in Demo options choose **Look at the app as the demo helper** to reply, and **Hand it back to the owner now**. It uses the same locking code as the real thing. **Pretend 1 day passes** shows what expiry looks like.

## Part 4: Getting a newer version
The same download link always has the newest build (about 10 minutes after each update). Install it over the old one. If Android refuses, uninstall the old one first (this deletes everything in the app).

## Part 5: iPhone
There is no iPhone app. Apple signing has not been set up.

## Part 6: If something goes wrong

| Problem | What to do |
|---|---|
| Link shows 404 | Sign in to GitHub, then use the link again |
| No **Assets** list | The build may still be running (about 10 minutes). Try later |
| “App not installed” | Uninstall any older ScamCircle, then install again |
| App opens then closes | Tell me your phone model and Android version |
| **“Cannot start safely”** | The phone did not give the app a secure source of random numbers or storage. It stops on purpose. Tell me your phone model |
| **“Your saved data could not be opened”** | The key is missing or the data changed. Restore from a backup with your recovery secret (Settings), or erase and start again |
| Text too small or buttons cramped | Home > **Text size** > Large or Extra large |
| A pasted code is refused | Read the message under the box. Common reasons: already used, expired, from someone you have not checked, or made for another phone |
| Lost phone, no recovery secret | Everything in the app is gone for good. Nobody can reset it |

## GitHub words in plain English
- **Repository:** the project's folder on GitHub (`Devilwalkx/scamcircle`).
- **Release:** a labelled download. The `.apk` lives there.
- **Actions:** GitHub's robot. It tests and builds the app on each update.
- **Branch:** a version line. `main` is the official one.

You do not need to press anything on GitHub except downloading the file.
