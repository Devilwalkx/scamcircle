# Getting ScamCircle on your phone (no GitHub experience needed)

**What this is:** a test version of ScamCircle (version 0.2.0). It helps you look at a suspicious message, notice warning signs, and check it another way, optionally with someone you trust. It **cannot tell you a message is real or safe**, and it is **not for real private messages yet** (the way it locks and shares things has not been reviewed by an expert).

**It has never been run on a physical phone by its builders.** It has been run in the Android emulator on GitHub's servers (see docs/ANDROID_PASS_REPORT.md). TalkBack has not been tried.

## One-time uninstall if you had the older test build
The app has a new, unique app id (`app.devilwalkx.scamcircle`; the old test build used `invalid.placeholder.scamcircle`). To Android these are two different apps, so the old one is not updated: **uninstall the old ScamCircle first** (its test data is lost). From now on, new builds update the app in place.

---

## Part 1: Install on an Android phone

1. **On your phone**, open Chrome and go to **https://github.com/Devilwalkx/scamcircle/releases/tag/latest-test-build** (sign in if asked; the project may be private).
2. Under **Assets** tap **ScamCircle-test.apk**. If Chrome says *"This type of file can harm your device"*, tap **Download anyway**. This is a test build, not from the Play Store.
3. Open it. If Android says unknown apps are not allowed from this source, tap **Settings**, allow it, go back, tap **Install**. If **Play Protect** warns about an unrecognised developer, tap **Install anyway**. That is expected: the build is signed with the public Android test key.
4. Open ScamCircle. You should see one big **Check a message** button.

**Check which build you have:** tap the cog (top right), scroll to **About this build**. It shows the version, build number, app id (`app.devilwalkx.scamcircle`) and the commit.

The app asks Android for **no permissions at all**, and has no internet permission on purpose (Settings, "Works without internet"). If your phone's settings say it has no internet access, that is expected.

## Part 2: A 2-minute tour (one phone)

1. Tap **See a made-up example**. One clearly marked example message is added (you can delete it).
2. Read the result: what was found in the words, what could not be checked, **who sent it: Not verified**, and **how to check it another way**.
3. Tap **Check a message**, paste *“Hi Mum, new number, can you send £300 today? Don't tell Dad.”*, then try a friendly one like *“Back at five, need anything?”*. The friendly one is **not** called safe: it says that is not a check.
4. **From another app:** in your messages app, select some text, tap **Share**, choose **ScamCircle**. The text appears in the check box. (This path has been exercised only on the emulator.)
5. **A picture:** tap **It is in a picture**. ScamCircle cannot read pictures; you type what it says. You can crop it to send to someone you trust. It is sent through whatever app you pick and is not encrypted by ScamCircle.
6. Cog, **Settings**: colours, text size, recovery secret, backup, **What this app cannot do**, **How well does the checker work?** (read it: it is not a protection claim).

## Part 3: Try sharing with a second person

**With a second phone** (best):
1. Both phones install the app. On each: **People > Add a person**. Type your name, **Save my name**, then **Copy code** and send it to the other person (any messaging app).
2. On each phone tap **Next: paste their code**, paste, then **Add this person**.
3. Each phone now shows **4 made-up words** for the other person. **Phone each other** (or meet) and read your own words out (they are under **My code words**). If they match what the other phone shows, tap **Yes, they match**. If not, tap **No** and do not share anything.
4. On phone 1: **Check a message**, paste a message, **Ask someone I trust to look**, pick the person, choose what to hide, **Review**, **Create the code**. Then **Copy code** and send it. **It is not delivered until you send it.**
5. On phone 2: **Requests**, paste the code, **Open the code**, **Open**, **Reply**. Say *how* you checked and what you found (a thumbs-up on its own does not count). Send the reply code back.
6. On phone 1: **Requests**, paste the reply. Open the message to see it.

**With one phone (demonstration only, a simulation, not real delivery):** Settings, **Demonstration tools (not for real use)**, **Add a pretend second person**. Share to the pretend helper, tap **Hand it to the demo helper now**, then choose **Look at the app as the pretend helper** to reply. It uses the same locking code as the real thing but it is not a second person or a second phone.

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
| Text too small or buttons cramped | cog > **Text size** > Large or Extra large |
| A pasted code is refused | Read the message under the box. Common reasons: already used, expired, from someone you have not checked, or made for another phone |
| Lost phone, no recovery secret | Everything in the app is gone for good. Nobody can reset it |

## GitHub words in plain English
- **Repository:** the project's folder on GitHub (`Devilwalkx/scamcircle`).
- **Release:** a labelled download. The `.apk` lives there.
- **Actions:** GitHub's robot. It tests and builds the app on each update.
- **Branch:** a version line. `main` is the official one.

You do not need to press anything on GitHub except downloading the file.
