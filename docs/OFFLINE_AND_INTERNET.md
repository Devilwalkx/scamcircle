# The reported "no internet access"

**Conclusion: it is a design choice, not a defect.** ScamCircle declares no `INTERNET` permission on purpose (DECISIONS D-003; `blockedPermissions` in `apps/mobile/app.json`; CI fails if the generated manifest or the built APK requests any permission).

What was checked
- The generated Android manifest has no active permission (every entry is a `tools:node="remove"` marker). CI checks this on every build.
- The built APK is checked with `aapt dump permissions` after all libraries are merged; the build fails if any permission is listed.
- In the Android emulator job, `dumpsys package app.devilwalkx.scamcircle` is checked to show no `android.permission.INTERNET` (evidence file `internet-permission.txt`). Emulator only; never a physical phone.
- The app code has no network calls; a core test enforces it, and the browser test records every request and fails if any leaves the app.

What a person may see: Android settings may show "no internet access" or no permissions for the app, and some Android versions list the app as unable to use mobile data or Wi-Fi. That is the expected result of the missing permission. Nothing was found that suggests anything else causes it.

What it costs: no delivery receipts, no reply notifications, no link opening or look-ups, rule updates only with an app update, no way for the developers to recover data. The app says this in Settings, "Works without internet".

What would change it: any feature that needs the network (a server for delivery receipts, for example) would need a deliberate permission change, a new data-flow review and an update to the CI permission check.
