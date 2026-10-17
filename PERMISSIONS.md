# Permissions

The app asks Android for **nothing**. Checked three ways on every build (CI job `android-apk`):
1. the generated manifest may contain only `tools:node="remove"` markers for permissions;
2. the **built APK** is dumped with `aapt dump permissions` after all libraries are merged, and the build fails if any `uses-permission` appears (the only exception is `app.devilwalkx.scamcircle.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, a signature-level permission that AndroidX defines for itself);
3. in the emulator job `dumpsys package` must show no `android.permission.INTERNET` (emulator only, not a physical phone).

A permission may be added only for a function that is implemented and authorised, with an update to this file, to the CI check and to `packages/core/test/appconfig.test.ts`.

| Permission | Status | Reason |
|---|---|---|
| `INTERNET` | **blocked** | The app never needs the network, and blocking it means the installed app cannot send anything. This is the reported "no internet access": a design choice (docs/OFFLINE_AND_INTERNET.md, DECISIONS D-003) |
| `CAMERA`, `RECORD_AUDIO` | blocked | Not used. Pictures come from the system photo picker or another app's share sheet |
| `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` | blocked | Not used |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | blocked | Not used. Android gives the app read access to the single picture or text another app shares |
| `SYSTEM_ALERT_WINDOW`, `VIBRATE` | blocked | Added by tooling for developer menus; not needed |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | blocked | Pulled in by the secure-storage library; the app does not use biometrics (found by the CI APK check in run 9, now blocked) |
| `com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE` | blocked | Pulled in by the application-info library; the install-referrer feature is not used |
| Photo library | no permission | `expo-image-picker` uses the system photo picker; the app gets only the one picture chosen |
| Notifications, contacts, SMS, call log, accessibility service, overlay | not requested | The app does not read other apps, contacts or messages |

## Share-in (receiving text and pictures from other apps)
Not a permission, an **intent filter**: the main activity accepts `ACTION_SEND` for `text/plain` and `image/*` (added by the `expo-sharing` config plugin; it also adds an empty `SEND_MULTIPLE` filter that matches nothing useful). Any app can therefore hand ScamCircle text or one picture, but only when the person picks ScamCircle in the share sheet. Android grants read access to that one item. Shared text is put in the check box and nothing is analysed or stored until the person taps Check. Shared web addresses arrive as text; they are never opened or resolved (the `expo-sharing` call that resolves addresses is deliberately not used).

## Sharing out
`Share` (text) and `expo-sharing` (a cropped picture, through a FileProvider) hand data to the share sheet. The person chooses the app and the recipient. ScamCircle cannot see whether anything was sent.

iOS: not built or tested. Web build: asks for no browser permission; the clipboard is used only when the person taps Paste or Copy.
